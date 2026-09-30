<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\PaymentProviderSetting;
use App\Models\QrisTransaction;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\FifoCostingService;
use App\Services\JournalDraft;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Checkout POS: server menghitung ulang seluruh angka dari baris keranjang dan pembayaran,
 * memotong stok FIFO, lalu membukukan jurnal SAK EMKM dalam satu transaksi DB.
 * Setiap nota lunas saat checkout (Tunai, Transfer, QRIS, atau kombinasinya).
 */
class CheckoutService
{
    public function __construct(
        private readonly FifoCostingService $fifo,
        private readonly AccountingEngine $engine,
    ) {
    }

    public function checkout(array $data, ?User $user): Sale
    {
        return DB::transaction(function () use ($data, $user) {
            $lines = CartLines::build($data['items']);

            $subtotal = round(array_sum(array_column($lines, 'net')), 2);
            $notaDiscount = round((float) ($data['discount_amount'] ?? 0), 2);
            if ($notaDiscount > $subtotal) {
                throw new PosRuleException('Diskon nota melebihi subtotal belanja.');
            }
            $grandTotal = round($subtotal - $notaDiscount, 2);

            $payments = $this->buildPayments($data['payments'] ?? [], $grandTotal);

            $reference = DocumentNumber::next(Sale::class, 'reference', 'OB3-INV');
            $date = now()->toDateString();
            $single = count($payments) === 1 ? $payments[0] : null;

            $sale = Sale::create([
                'reference' => $reference,
                'date' => $date,
                'customer_name' => $data['customer_name'] ?? 'Pelanggan Walk-In',
                'customer_phone' => $data['customer_phone'] ?? null,
                'vehicle_plate' => $data['vehicle_plate'] ?? 'Umum',
                'vehicle_model' => $data['vehicle_model'] ?? null,
                'cashier_name' => $user?->name ?? 'Kasir POS',
                'gross_sales_amount' => round(array_sum(array_column($lines, 'gross')), 2),
                'discount_amount' => round(array_sum(array_column($lines, 'discount')) + $notaDiscount, 2),
                'total_amount' => $grandTotal,
                'paid_amount' => round(array_sum(array_column($payments, 'amount')), 2),
                'change_amount' => round(array_sum(array_column($payments, 'change_amount')), 2),
                'payment_method' => $single['method'] ?? 'SPLIT',
                'payment_reference' => $single['reference'] ?? null,
                'payment_provider' => $single['provider_name'] ?? null,
                'fee_percentage' => $single['fee_percentage'] ?? 0,
                'fee_amount' => round(array_sum(array_column($payments, 'fee_amount')), 2),
                'net_received' => round(array_sum(array_column($payments, 'net_received')), 2),
                'total_hpp' => 0,
                'total_profit' => 0,
                'notes' => $data['notes'] ?? null,
                'status' => 'LUNAS',
                'stock_deducted' => true,
                'branch_id' => 3,
            ]);

            $fifoCogs = $this->storeLines($sale, $lines);
            $manualCost = round(array_sum(array_map(fn ($l) => $l['manual_cost'] * $l['quantity'], $lines)), 2);
            $sale->update([
                'total_hpp' => round($fifoCogs + $manualCost, 2),
                'total_profit' => round($grandTotal - $fifoCogs - $manualCost, 2),
            ]);

            foreach ($payments as $payment) {
                $salePayment = SalePayment::create(['sale_id' => $sale->id] + Arr::except($payment, 'qris_transaction'));
                // Order QRIS terkunci ke baris ini selamanya (juga setelah void): satu pelunasan, satu nota.
                $payment['qris_transaction']?->update(['sale_payment_id' => $salePayment->id]);
            }

            $this->postJournal($sale, $lines, $payments, $notaDiscount, $fifoCogs);

            return $sale->fresh();
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildPayments(array $input, float $amountDue): array
    {
        $payments = [];
        $claimed = [];
        foreach ($input as $row) {
            $method = $row['method'];
            $amount = round((float) $row['amount'], 2);
            $provider = $this->provider($method, $row['provider_id'] ?? null);
            // Hanya QRIS yang kena MDR (beban toko), dihitung dari pengaturan provider di server.
            $fee = $method === 'QRIS'
                ? $provider->calculateQrisFee($amount)
                : ['fee_percentage' => 0.0, 'fee_amount' => 0.0];

            $tendered = $amount;
            if ($method === 'TUNAI') {
                $tendered = round((float) ($row['tendered'] ?? $amount), 2);
                if ($tendered < $amount) {
                    throw new PosRuleException('Uang tunai yang diterima kurang dari nominal pembayaran tunai.');
                }
            }

            // QRIS dinamis (ada nomor order Midtrans) harus lunas dan dipakai sekali. QRIS statis tanpa nomor order
            // dicatat atas konfirmasi kasir; pemeriksaannya lewat rekonsiliasi bank 1-1001.
            $qris = null;
            if ($method === 'QRIS' && ! empty($row['reference'])) {
                $qris = $this->claimQris($row['reference'], $amount, $claimed);
                $claimed[] = $row['reference'];
            }

            $payments[] = [
                'method' => $method,
                'account_code' => PosAccounts::forMethod($method),
                'amount' => $amount,
                'tendered_amount' => $tendered,
                'change_amount' => round($tendered - $amount, 2),
                'fee_percentage' => (float) $fee['fee_percentage'],
                'fee_amount' => (float) $fee['fee_amount'],
                'net_received' => round($amount - (float) $fee['fee_amount'], 2),
                'provider_name' => $provider?->provider_name,
                'reference' => $row['reference'] ?? null,
                'qris_transaction' => $qris,
            ];
        }

        $paid = round(array_sum(array_column($payments, 'amount')), 2);
        if (abs($paid - $amountDue) > 0.001) {
            throw new PosRuleException(
                'Total pembayaran (Rp '.number_format($paid, 0, ',', '.').') tidak sama dengan tagihan (Rp '.number_format($amountDue, 0, ',', '.').').'
            );
        }

        return $payments;
    }

    /**
     * Order QRIS Midtrans harus sudah lunas di qris_transactions (webhook, cek status, atau simulasi demo), belum
     * dipakai nota lain (juga tidak dua kali di checkout ini), dan nominal lunasnya sama dengan baris pembayaran.
     * Baris dikunci sampai transaksi selesai agar dua checkout bersamaan tidak memakai order yang sama.
     *
     * @param  array<int, string>  $claimed  order yang sudah dipakai baris sebelumnya di checkout ini
     */
    private function claimQris(string $orderId, float $amount, array $claimed): QrisTransaction
    {
        $tx = QrisTransaction::where('order_id', $orderId)->lockForUpdate()->first();

        if (! $tx || ! $tx->isSettled()) {
            throw new PosRuleException('Pembayaran QRIS belum diterima (status: '.($tx?->transaction_status ?? 'tidak ditemukan').').');
        }
        if ($tx->sale_payment_id || in_array($orderId, $claimed, true)) {
            throw new PosRuleException("Pembayaran QRIS {$orderId} sudah dipakai untuk nota lain.");
        }
        if (abs((float) $tx->gross_amount - $amount) > 0.001) {
            throw new PosRuleException(
                'Nominal QRIS yang lunas (Rp '.number_format((float) $tx->gross_amount, 0, ',', '.').') tidak sama dengan nominal pembayaran QRIS (Rp '.number_format($amount, 0, ',', '.').').'
            );
        }

        return $tx;
    }

    /**
     * Provider dari pengaturan server, bukan nama/fee kiriman klien. QRIS wajib punya provider karena MDR-nya
     * dihitung dari sana; transfer boleh tanpa provider (hanya label bank). Semua transfer dan QRIS tetap
     * dibukukan ke satu rekening bank toko (1-1001, PosAccounts::forMethod).
     */
    private function provider(string $method, mixed $id): ?PaymentProviderSetting
    {
        if ($method === 'TUNAI') {
            return null;
        }

        $type = $method === 'QRIS' ? 'qris' : 'bank';
        if (! $id) {
            if ($type === 'qris') {
                throw new PosRuleException('Pilih provider QRIS agar potongan MDR dihitung server.');
            }

            return null;
        }

        $provider = PaymentProviderSetting::active()->where('method_type', $type)->find($id);
        if (! $provider) {
            throw new PosRuleException('Provider pembayaran tidak ditemukan atau tidak aktif.');
        }

        return $provider;
    }

    /**
     * Simpan baris nota; baris produk katalog memotong stok FIFO. Mengembalikan total HPP FIFO.
     */
    private function storeLines(Sale $sale, array $lines): float
    {
        $fifoCogs = 0.0;

        foreach ($lines as $line) {
            $detail = SaleDetail::create([
                'sale_id' => $sale->id,
                'product_id' => $line['product']?->id,
                'item_type' => $line['type'],
                'item_name' => $line['name'],
                'service_id' => $line['service_id'],
                'is_manual' => $line['is_manual'],
                'quantity' => $line['quantity'],
                'unit_price' => $line['unit_price'],
                'sub_total' => $line['net'],
                'discount_amount' => $line['discount'],
                'unit_cost_hpp' => $line['manual_cost'],
                'total_cost_hpp' => round($line['manual_cost'] * $line['quantity'], 2),
                'profit_amount' => round($line['net'] - $line['manual_cost'] * $line['quantity'], 2),
            ]);

            if ($line['product']) {
                $cogs = $this->fifo->allocateFifo($line['product']->id, $line['quantity'], $detail->id, $sale->reference)['total_cogs'];
                $fifoCogs += $cogs;
                $detail->update([
                    'unit_cost_hpp' => round($cogs / $line['quantity'], 2),
                    'total_cost_hpp' => $cogs,
                    'profit_amount' => round($line['net'] - $cogs, 2),
                ]);
            }
        }

        return round($fifoCogs, 2);
    }

    private function postJournal(Sale $sale, array $lines, array $payments, float $notaDiscount, float $fifoCogs): void
    {
        $ref = $sale->reference;
        $draft = new JournalDraft();

        foreach ($payments as $p) {
            $draft->debit($p['account_code'], $p['net_received'], "Penerimaan {$p['method']} Nota {$ref}");
        }
        $draft->debit(PosAccounts::MDR_EXPENSE, array_sum(array_column($payments, 'fee_amount')), "Beban MDR QRIS Nota {$ref}");
        $draft->debit(PosAccounts::SALES_DISCOUNT, array_sum(array_column($lines, 'discount')) + $notaDiscount, "Diskon penjualan Nota {$ref}");

        $goods = array_sum(array_map(fn ($l) => $l['type'] === 'PRODUCT' ? $l['gross'] : 0, $lines));
        $services = array_sum(array_map(fn ($l) => $l['type'] === 'SERVICE' ? $l['gross'] : 0, $lines));
        $draft->credit(PosAccounts::REVENUE_GOODS, $goods, "Pendapatan ban & barang Nota {$ref}");
        $draft->credit(PosAccounts::REVENUE_SERVICE, $services, "Pendapatan jasa Nota {$ref}");

        $draft->debit(PosAccounts::COGS, $fifoCogs, "HPP FIFO Nota {$ref}");
        $draft->credit(PosAccounts::INVENTORY, $fifoCogs, "Pengurangan persediaan Nota {$ref}");

        // Nota bernilai Rp 0 (mis. jasa gratis tanpa HPP) tidak menggerakkan akun apa pun: tanpa jurnal.
        if ($draft->isEmpty()) {
            return;
        }

        $draft->post($this->engine, 'POS_SALE', $ref, "Penjualan POS Kasir Nota {$ref} ({$sale->customer_name})", $sale->date->toDateString());
    }
}
