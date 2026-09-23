<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
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
     * @return array{purchase: Purchase, journal: \App\Models\JournalEntry}
     */
    public function receive(array $data, ?User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::findOrFail($data['product_id']);
            $supplier = ! empty($data['supplier_id']) ? Supplier::findOrFail($data['supplier_id']) : null;
            $supplierName = $supplier?->supplier_name ?? $data['source_name'];
            $date = $data['purchase_date'] ?? now()->toDateString();
            $method = $data['payment_method'];
            $total = round((int) $data['quantity'] * (float) $data['batch_cost'], 2);
            $isTempo = $method === 'TEMPO';

            $dueDate = null;
            if ($isTempo) {
                $dueDate = $data['due_date']
                    ?? now()->parse($date)->addDays($supplier?->payment_terms_days ?: 30)->toDateString();
            }

            $purchase = Purchase::create([
                'purchase_number' => DocumentNumber::next(Purchase::class, 'purchase_number', 'GR'),
                'supplier_id' => $supplier?->id,
                'supplier_name' => $supplierName,
                'supplier_invoice' => $data['supplier_invoice'] ?? null,
                'purchase_date' => $date,
                'payment_method' => $method,
                'due_date' => $dueDate,
                'total_amount' => $total,
                'paid_amount' => $isTempo ? 0 : $total,
                'status' => $isTempo ? 'BELUM_LUNAS' : 'LUNAS',
                'notes' => $data['notes'] ?? null,
                'operator_name' => $user?->name,
            ]);

            $batch = $this->fifo->addBatch($product->id, (int) $data['quantity'], (float) $data['batch_cost'], $supplierName, $date);
            $batch->update(['purchase_id' => $purchase->id]);

            $journal = (new JournalDraft())
                ->debit('1-2000', $total, "Pembelian {$data['quantity']} pcs {$product->product_name} ({$batch->batch_code})")
                ->credit(self::PAYMENT_ACCOUNTS[$method], $total, $isTempo ? "Hutang dagang {$supplierName}" : "Pembayaran {$method} ke {$supplierName}")
                ->post($this->engine, 'PURCHASE', $purchase->purchase_number, "Penerimaan barang {$purchase->purchase_number} dari {$supplierName}", $date);

            $purchase->update(['journal_entry_number' => $journal->entry_number]);

            return ['purchase' => $purchase->fresh(), 'batch' => $batch, 'journal' => $journal];
        });
    }
}
