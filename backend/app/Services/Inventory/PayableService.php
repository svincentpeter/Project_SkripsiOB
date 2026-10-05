<?php

namespace App\Services\Inventory;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Pelunasan hutang supplier dari faktur pembelian TEMPO (Dr 2-1000 / Cr kas atau bank).
 */
class PayableService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @return array{purchase: Purchase, journal: JournalEntry}
     */
    public function pay(int $purchaseId, array $data, ?User $user): array
    {
        return DB::transaction(function () use ($purchaseId, $data, $user) {
            $purchase = Purchase::lockForUpdate()->findOrFail($purchaseId);
            if ($purchase->payment_method !== 'TEMPO' || in_array($purchase->status, ['LUNAS', 'BATAL'], true)) {
                throw new PosRuleException("Faktur {$purchase->purchase_number} tidak memiliki hutang terbuka.");
            }

            $amount = round((float) $data['amount'], 2);
            $remaining = $purchase->remaining();
            if ($amount > $remaining + 0.001) {
                throw new PosRuleException('Pembayaran melebihi sisa hutang (Rp '.number_format($remaining, 0, ',', '.').').');
            }

            $date = Carbon::parse($data['payment_date'] ?? now())->toDateString();
            $invoiceDate = $purchase->purchase_date->toDateString();
            if ($date < $invoiceDate) {
                throw new PosRuleException("Tanggal pembayaran {$date} sebelum tanggal faktur {$invoiceDate}.");
            }
            $journal = (new JournalDraft())
                ->debit('2-1000', $amount, "Pelunasan hutang {$purchase->supplier_name} ({$purchase->purchase_number})")
                ->credit($data['account_code'], $amount, "Pembayaran hutang {$purchase->purchase_number}")
                ->post($this->engine, 'DEBT_PAYMENT', $purchase->purchase_number, "Pelunasan hutang supplier {$purchase->supplier_name}".(! empty($data['notes']) ? " ({$data['notes']})" : ''), $date);

            PurchasePayment::create([
                'purchase_id' => $purchase->id,
                'payment_date' => $date,
                'amount' => $amount,
                'account_code' => $data['account_code'],
                'notes' => $data['notes'] ?? null,
                'operator_name' => $user?->name,
                'journal_entry_number' => $journal->entry_number,
            ]);

            $paid = round((float) $purchase->paid_amount + $amount, 2);
            $purchase->update([
                'paid_amount' => $paid,
                'status' => $paid >= (float) $purchase->total_amount - (float) $purchase->returned_amount - 0.001 ? 'LUNAS' : 'SEBAGIAN',
            ]);

            return ['purchase' => $purchase->fresh(), 'journal' => $journal];
        }, 3); // korban deadlock (cek saldo kas/bank tidak negatif: S lock journal_items) diulang; closure hanya menulis DB
    }

    /**
     * Pembayaran per supplier dialokasikan ke faktur tempo yang jatuh temponya paling awal.
     *
     * @return array<int, JournalEntry>
     */
    public function paySupplier(int $supplierId, float $amount, string $accountCode, ?string $date, ?string $notes, ?User $user): array
    {
        return DB::transaction(function () use ($supplierId, $amount, $accountCode, $date, $notes, $user) {
            $open = Purchase::where('supplier_id', $supplierId)
                ->where('payment_method', 'TEMPO')
                ->whereNotIn('status', ['LUNAS', 'BATAL'])
                ->orderBy('due_date')->orderBy('id')
                ->lockForUpdate()
                ->get();

            $outstanding = round($open->sum(fn (Purchase $p) => $p->remaining()), 2);
            if ($amount > $outstanding + 0.001) {
                throw new PosRuleException('Pembayaran melebihi total hutang supplier (Rp '.number_format($outstanding, 0, ',', '.').').');
            }

            $journals = [];
            $left = round($amount, 2);
            foreach ($open as $purchase) {
                if ($left <= 0) {
                    break;
                }
                $part = min($left, $purchase->remaining());
                $journals[] = $this->pay($purchase->id, [
                    'amount' => $part, 'account_code' => $accountCode, 'payment_date' => $date, 'notes' => $notes,
                ], $user)['journal'];
                $left = round($left - $part, 2);
            }

            return $journals;
        }, 3); // korban deadlock (cek saldo kas/bank tidak negatif: S lock journal_items) diulang; closure hanya menulis DB
    }
}
