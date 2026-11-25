<?php

namespace App\Services\Inventory;

use App\Exceptions\PosRuleException;
use App\Models\Product;
use App\Models\ProductPriceAudit;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use App\Services\Accounting\PeriodLock;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\FifoCostingService;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Penerimaan barang dari supplier: dokumen pembelian (GR), batch FIFO baru, dan jurnal pembelian.
 * Pembelian TEMPO menjadi hutang supplier (2-1000) yang dilunasi lewat PayableService.
 */
class GoodsReceiptService
{
    public const PAYMENT_ACCOUNTS = ['TUNAI' => '1-1000', 'TRANSFER_BCA' => '1-1001', 'TEMPO' => '2-1000'];

    public function __construct(
        private readonly FifoCostingService $fifo,
        private readonly AccountingEngine $engine,
    ) {
    }

    /**
     * Penerimaan satu produk (kompatibilitas klien lama & tes).
     *
     * @return array{purchase: Purchase, batch: \App\Models\ProductBatch, batches: list<\App\Models\ProductBatch>, journal: ?\App\Models\JournalEntry}
     */
    public function receive(array $data, ?User $user): array
    {
        $item = [
            'product_id' => $data['product_id'],
            'quantity' => $data['quantity'],
            'batch_cost' => $data['batch_cost'],
            'selling_price' => $data['selling_price'] ?? null,
            'price_change_reason' => $data['price_change_reason'] ?? null,
        ];
        if (array_key_exists('invoice_total', $data) && $data['invoice_total'] !== null) {
            $item['line_total'] = $data['invoice_total'];
        }

        return $this->receiveMany([
            'supplier_id' => $data['supplier_id'] ?? null,
            'source_name' => $data['source_name'] ?? null,
            'supplier_invoice' => $data['supplier_invoice'] ?? null,
            'purchase_date' => $data['purchase_date'] ?? null,
            'payment_method' => $data['payment_method'],
            'due_date' => $data['due_date'] ?? null,
            'notes' => $data['notes'] ?? null,
            'dpp_amount' => $data['dpp_amount'] ?? null,
            'ppn_amount' => $data['ppn_amount'] ?? null,
            'invoice_total' => $data['invoice_total'] ?? null,
            'items' => [$item],
        ], $user);
    }

    /**
     * Penerimaan multi-produk dalam satu dokumen GR & satu jurnal pembelian seimbang (SAK EMKM).
     * Seluruh selisih pembulatan faktur (DPP + PPN) diserap ke lapisan batch FIFO agar Σ(qty × modal) == saldo 1-2000.
     *
     * @return array{purchase: Purchase, batch: \App\Models\ProductBatch, batches: list<\App\Models\ProductBatch>, journal: ?\App\Models\JournalEntry}
     */
    public function receiveMany(array $data, ?User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $rawItems = array_values($data['items'] ?? []);
            if (count($rawItems) === 0) {
                throw new PosRuleException('Minimal satu produk harus dimasukkan ke keranjang penerimaan barang.');
            }

            $supplier = ! empty($data['supplier_id']) ? Supplier::findOrFail($data['supplier_id']) : null;
            $supplierName = $supplier?->supplier_name ?? (string) ($data['source_name'] ?? '');
            $date = $data['purchase_date'] ?? now()->toDateString();
            // Penerimaan bonus (Rp 0) tanpa jurnal tetap mengubah stok bulan itu, jadi kunci periode dicek di sini.
            PeriodLock::assertOpen($date);

            $method = $data['payment_method'];
            $isTempo = $method === 'TEMPO';

            // Siapkan rincian baris dan nilai dalam sen agar tidak ada selisih pembulatan floating-point.
            $prepared = [];
            $sumCents = 0;
            foreach ($rawItems as $raw) {
                $qty = (int) $raw['quantity'];
                $cost = (float) $raw['batch_cost'];
                $hasExplicitLineTotal = array_key_exists('line_total', $raw) && $raw['line_total'] !== null;

                if ($hasExplicitLineTotal) {
                    $lineCents = (int) round((float) $raw['line_total'] * 100);
                    if ($lineCents <= 0) {
                        throw new PosRuleException('Total faktur harus lebih besar dari 0.');
                    }
                    if (abs($lineCents - (int) round($qty * $cost * 100)) > 100) {
                        throw new PosRuleException('Total faktur Rp '.number_format($lineCents / 100, 2, ',', '.')
                            .' tidak cocok dengan jumlah × modal per unit (Rp '.number_format($qty * $cost, 2, ',', '.').').');
                    }
                } else {
                    $lineCents = (int) round(round($qty * $cost, 2) * 100);
                }

                $sumCents += $lineCents;
                $prepared[] = [
                    'product_id' => (int) $raw['product_id'],
                    'quantity' => $qty,
                    'batch_cost' => $cost,
                    'line_cents' => $lineCents,
                    'use_cent_layers' => $hasExplicitLineTotal,
                    'selling_price' => isset($raw['selling_price']) && $raw['selling_price'] !== null
                        ? round((float) $raw['selling_price'], 2)
                        : null,
                    'price_change_reason' => trim((string) ($raw['price_change_reason'] ?? '')),
                ];
            }

            $grandCents = $sumCents;
            if (array_key_exists('invoice_total', $data) && $data['invoice_total'] !== null) {
                $invoiceCents = (int) round((float) $data['invoice_total'] * 100);
                if ($invoiceCents <= 0) {
                    throw new PosRuleException('Total faktur harus lebih besar dari 0.');
                }
                $toleranceCents = max(100, count($prepared) * 100);
                if (abs($invoiceCents - $sumCents) > $toleranceCents) {
                    throw new PosRuleException('Total faktur Rp '.number_format($invoiceCents / 100, 2, ',', '.')
                        .' tidak cocok dengan jumlah × modal per unit (Rp '.number_format($sumCents / 100, 2, ',', '.').').');
                }
                $diffCents = $invoiceCents - $sumCents;
                if ($diffCents !== 0) {
                    // Serap selisih pembulatan PPN faktur (biasanya ±Rp 1–5) ke baris bernilai terakhir agar FIFO == 1-2000 persis.
                    for ($i = count($prepared) - 1; $i >= 0; $i--) {
                        if ($prepared[$i]['line_cents'] + $diffCents > 0) {
                            $prepared[$i]['line_cents'] += $diffCents;
                            $prepared[$i]['use_cent_layers'] = true;
                            break;
                        }
                    }
                }
                $grandCents = $invoiceCents;
            }

            $grandTotal = $grandCents / 100;
            $dpp = $data['dpp_amount'] ?? null;
            $ppn = $data['ppn_amount'] ?? null;
            $this->assertDppPpn($dpp, $ppn, $grandTotal);

            $dueDate = null;
            if ($isTempo) {
                $dueDate = $data['due_date']
                    ?? now()->parse($date)->addDays($supplier?->payment_terms_days ?: 30)->toDateString();
            }

            $purchase = Purchase::create([
                'purchase_number' => DocumentNumber::next(Purchase::class, 'purchase_number', 'GR', $date),
                'supplier_id' => $supplier?->id,
                'supplier_name' => $supplierName,
                'supplier_invoice' => $data['supplier_invoice'] ?? null,
                'purchase_date' => $date,
                'payment_method' => $method,
                'due_date' => $dueDate,
                'total_amount' => $grandTotal,
                'dpp_amount' => $dpp ?? 0,
                'ppn_amount' => $ppn ?? 0,
                'paid_amount' => $isTempo ? 0 : $grandTotal,
                'status' => $isTempo && $grandTotal > 0 ? 'BELUM_LUNAS' : 'LUNAS',
                'notes' => $data['notes'] ?? null,
                'operator_name' => $user?->name,
            ]);

            $draft = new JournalDraft();
            $allBatches = [];
            $isOwner = ($user?->role ?? '') === 'OWNER';

            foreach ($prepared as $line) {
                $product = Product::with(['activeBatches', 'brandRelation'])->findOrFail($line['product_id']);
                $oldCost = (float) ($product->product_cost ?? 0);
                $oldPrice = (float) ($product->product_price ?? 0);
                $qty = $line['quantity'];
                $lineTotal = $line['line_cents'] / 100;

                $layers = $line['use_cent_layers'] && $line['line_cents'] > 0
                    ? FifoCostingService::centLayers($qty, $line['line_cents'])
                    : [[$qty, $line['batch_cost']]];

                $lineBatches = [];
                foreach ($layers as [$layerQty, $layerCost]) {
                    $b = $this->fifo->addBatch($product->id, $layerQty, $layerCost, $supplierName, $date);
                    $b->update(['purchase_id' => $purchase->id]);
                    $lineBatches[] = $b;
                    $allBatches[] = $b;
                }
                $codes = implode(', ', array_map(fn ($b) => $b->batch_code, $lineBatches));

                if ($lineTotal > 0) {
                    $draft->debit('1-2000', $lineTotal, "Pembelian {$qty} pcs {$product->product_name} ({$codes})");
                }

                $product->refresh()->load(['activeBatches', 'brandRelation']);
                $newCost = (float) ($product->product_cost ?? 0);
                $refHpp = $product->referenceHpp();
                $minSellingPrice = $product->minimumSellingPrice();
                $minPctLabel = round($product->minimumMarkupRate() * 100, 1);
                $requestedSellPrice = $line['selling_price'];
                $priceReason = $line['price_change_reason'];

                if ($requestedSellPrice !== null && $requestedSellPrice > 0) {
                    if ($refHpp > 0 && $requestedSellPrice + 0.01 < $minSellingPrice) {
                        throw new PosRuleException(
                            "Harga jual baru untuk {$product->product_name} minimal harus +{$minPctLabel}% dari HPP patokan Rp "
                            .number_format($refHpp, 0, ',', '.').' (minimal Rp '.number_format($minSellingPrice, 0, ',', '.').').'
                        );
                    }
                    if (abs($requestedSellPrice - $oldPrice) > 0.01 || abs($newCost - $oldCost) > 0.01) {
                        $product->update(['product_price' => $requestedSellPrice]);
                        ProductPriceAudit::create([
                            'product_id' => $product->id,
                            'old_cost' => $oldCost,
                            'new_cost' => $newCost,
                            'reference_hpp' => $refHpp,
                            'old_price' => $oldPrice,
                            'new_price' => $requestedSellPrice,
                            'cost_change_percent' => $oldCost > 0 ? round((($newCost - $oldCost) / $oldCost) * 100, 2) : null,
                            'price_change_percent' => $oldPrice > 0 ? round((($requestedSellPrice - $oldPrice) / $oldPrice) * 100, 2) : 100.0,
                            'markup_percent' => $refHpp > 0 ? round((($requestedSellPrice - $refHpp) / $refHpp) * 100, 2) : null,
                            'change_source' => 'goods_receipt_restock',
                            'changed_field' => abs($requestedSellPrice - $oldPrice) > 0.01 ? 'both' : 'cost',
                            'context_month' => substr($date, 0, 7),
                            'changed_by' => $user?->id,
                            'actor_name' => $user?->name ?? 'Petugas Gudang',
                            'actor_role' => $user?->role ?? 'GUDANG',
                            'applies_to' => 'CATALOG',
                            'reason' => $priceReason !== '' ? $priceReason : "Penyesuaian harga jual saat restock {$purchase->purchase_number}",
                            'is_read_by_owner' => $isOwner,
                            'is_reviewed_by_owner' => $isOwner,
                            'reviewed_at' => $isOwner ? now() : null,
                            'reviewed_by' => $isOwner ? $user?->id : null,
                        ]);
                    }
                } elseif (abs($newCost - $oldCost) > 0.01 && ($oldPrice <= 0 || $oldPrice + 0.01 < $minSellingPrice)) {
                    // HPP batch baru naik sehingga harga jual lama di bawah standar margin (atau masih Rp 0): beri notifikasi ke Owner.
                    ProductPriceAudit::create([
                        'product_id' => $product->id,
                        'old_cost' => $oldCost,
                        'new_cost' => $newCost,
                        'reference_hpp' => $refHpp,
                        'old_price' => $oldPrice,
                        'new_price' => $oldPrice,
                        'cost_change_percent' => $oldCost > 0 ? round((($newCost - $oldCost) / $oldCost) * 100, 2) : null,
                        'price_change_percent' => 0,
                        'markup_percent' => $refHpp > 0 && $oldPrice > 0 ? round((($oldPrice - $refHpp) / $refHpp) * 100, 2) : 0,
                        'change_source' => 'goods_receipt_margin_warning',
                        'changed_field' => 'cost',
                        'context_month' => substr($date, 0, 7),
                        'changed_by' => $user?->id,
                        'actor_name' => $user?->name ?? 'Petugas Gudang',
                        'actor_role' => $user?->role ?? 'GUDANG',
                        'applies_to' => 'CATALOG',
                        'reason' => "HPP batch baru ({$purchase->purchase_number}) menjadi Rp ".number_format($newCost, 0, ',', '.')
                            ."; harga jual katalog perlu disesuaikan ke minimal +{$minPctLabel}% (Rp ".number_format($minSellingPrice, 0, ',', '.').').',
                        'is_read_by_owner' => false,
                        'is_reviewed_by_owner' => false,
                    ]);
                }
            }

            if ($grandTotal > 0) {
                $draft->credit(
                    self::PAYMENT_ACCOUNTS[$method],
                    $grandTotal,
                    $isTempo ? "Hutang dagang {$supplierName}" : "Pembayaran {$method} ke {$supplierName}"
                );
            }

            // Barang bonus (harga pokok Rp 0) tidak mengubah nilai persediaan: tanpa jurnal.
            $journal = null;
            if (! $draft->isEmpty()) {
                $itemCountLabel = count($prepared) > 1 ? ' ('.count($prepared).' item)' : '';
                $journal = $draft->post(
                    $this->engine,
                    'PURCHASE',
                    $purchase->purchase_number,
                    "Penerimaan barang {$purchase->purchase_number}{$itemCountLabel} dari {$supplierName}",
                    $date
                );
                $purchase->update(['journal_entry_number' => $journal->entry_number]);
            }

            return [
                'purchase' => $purchase->fresh('batches.product'),
                'batch' => $allBatches[0],
                'batches' => $allBatches,
                'journal' => $journal,
            ];
        }, 3); // korban deadlock (cek saldo kas/bank tidak negatif: S lock journal_items) diulang; closure hanya menulis DB
    }

    private function assertDppPpn(mixed $dpp, mixed $ppn, float $total): void
    {
        if ($dpp !== null && $ppn !== null && (int) round(((float) $dpp + (float) $ppn) * 100) !== (int) round($total * 100)) {
            throw new PosRuleException('DPP + PPN harus sama dengan total faktur (Rp '.number_format($total, 2, ',', '.').').');
        }
    }
}
