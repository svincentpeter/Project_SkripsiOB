<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\ReceivablePayment;
use App\Models\Sale;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Piutang dagang dari nota BON: daftar saldo per nota dan pelunasan (sebagian / penuh).
 */
class ReceivableService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function list(bool $openOnly): Collection
    {
        return Sale::with('receivablePayments')
            ->where('payment_method', 'BON')
            ->where('status', '!=', 'VOID')
            ->when($openOnly, fn ($q) => $q->where('status', 'PENDING'))
            ->orderBy('due_date')
            ->get()
            ->map(fn (Sale $sale) => self::toArray($sale));
    }

    public function pay(int $saleId, array $data, User $user): Sale
    {
        return DB::transaction(function () use ($saleId, $data, $user) {
            $sale = Sale::lockForUpdate()->findOrFail($saleId);
            if ($sale->payment_method !== 'BON' || $sale->status !== 'PENDING') {
                throw new PosRuleException("Nota {$sale->reference} bukan piutang yang masih terbuka.");
            }

            $remaining = self::remaining($sale);
            $amount = round((float) $data['amount'], 2);
            if ($amount > $remaining + 0.001) {
                throw new PosRuleException('Pembayaran melebihi sisa piutang (Rp '.number_format($remaining, 0, ',', '.').').');
            }

            $date = $data['payment_date'] ?? now()->toDateString();
            $journal = (new JournalDraft())
                ->debit($data['account_code'], $amount, "Pelunasan piutang Nota {$sale->reference}")
                ->credit(PosAccounts::RECEIVABLE, $amount, "Pengurangan piutang {$sale->customer_name}")
                ->post($this->engine, 'RECEIVABLE_PAYMENT', $sale->reference, "Penerimaan pelunasan BON {$sale->reference} ({$sale->customer_name})", $date);

            ReceivablePayment::create([
                'sale_id' => $sale->id,
                'payment_date' => $date,
                'amount' => $amount,
                'account_code' => $data['account_code'],
                'notes' => $data['notes'] ?? null,
                'operator_name' => $user->name,
                'journal_entry_number' => $journal->entry_number,
            ]);

            if ($remaining - $amount <= 0.001) {
                $sale->update(['status' => 'LUNAS']);
            }

            return $sale->fresh();
        });
    }

    public static function remaining(Sale $sale): float
    {
        return round((float) $sale->total_amount - (float) $sale->dp_applied - (float) $sale->receivablePayments()->sum('amount'), 2);
    }

    public static function toArray(Sale $sale): array
    {
        $sale->loadMissing('receivablePayments');
        $total = round((float) $sale->total_amount - (float) $sale->dp_applied, 2);
        $paid = round((float) $sale->receivablePayments->sum('amount'), 2);
        $remaining = round($total - $paid, 2);

        return [
            'sale_id' => $sale->id,
            'invoice_number' => $sale->reference,
            'customer_name' => $sale->customer_name,
            'customer_phone' => $sale->customer_phone,
            'vehicle_plate' => $sale->vehicle_plate,
            'date' => $sale->date?->toDateString(),
            'due_date' => $sale->due_date?->toDateString(),
            'total_amount' => $total,
            'paid_amount' => $paid,
            'remaining_amount' => $remaining,
            'status' => $remaining <= 0 ? 'LUNAS' : ($paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS'),
            'notes' => $sale->notes,
        ];
    }
}
