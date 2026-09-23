<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\SalesBooking;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Booking inden dengan uang muka (DP): DP dicatat sebagai kewajiban Uang Muka Pelanggan (2-1004)
 * sampai dipakai saat checkout atau dikembalikan saat booking dibatalkan.
 */
class BookingService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function create(array $data, User $user): SalesBooking
    {
        return DB::transaction(function () use ($data, $user) {
            $lines = CartLines::build($data['items'], reserveStock: false);
            $estimated = round(array_sum(array_column($lines, 'net')), 2);
            $dp = round((float) $data['dp_amount'], 2);
            if ($dp > $estimated) {
                throw new PosRuleException('DP melebihi estimasi total pesanan.');
            }

            $accountCode = PosAccounts::forMethod($data['payment_method']);
            $booking = SalesBooking::create([
                'booking_number' => DocumentNumber::next(SalesBooking::class, 'booking_number', 'BK'),
                'date' => now()->toDateString(),
                'customer_name' => $data['customer_name'] ?? 'Pelanggan Walk-In',
                'customer_phone' => $data['customer_phone'] ?? null,
                'vehicle_plate' => $data['vehicle_plate'] ?? '-',
                'vehicle_model' => $data['vehicle_model'] ?? null,
                'items' => array_map(fn ($l) => [
                    'type' => $l['type'],
                    'product_id' => $l['product']?->id,
                    'service_id' => $l['service_id'],
                    'name' => $l['name'],
                    'quantity' => $l['quantity'],
                    'unit_price' => $l['unit_price'],
                    'discount_per_item' => $l['discount_per_item'],
                    'is_manual' => $l['is_manual'],
                    'cost_price' => $l['manual_cost'],
                ], $lines),
                'estimated_total' => $estimated,
                'dp_amount' => $dp,
                'remaining_amount' => round($estimated - $dp, 2),
                'payment_method' => $data['payment_method'],
                'dp_account_code' => $accountCode,
                'notes' => $data['notes'] ?? null,
                'status' => 'ACTIVE',
                'operator_name' => $user->name,
            ]);

            (new JournalDraft())
                ->debit($accountCode, $dp, "DP booking {$booking->booking_number}")
                ->credit(PosAccounts::CUSTOMER_DEPOSIT, $dp, "Uang muka {$booking->customer_name}")
                ->post($this->engine, 'BOOKING_DP', $booking->booking_number, "Penerimaan DP booking {$booking->booking_number} ({$booking->customer_name})");

            return $booking;
        });
    }

    public function cancel(int $bookingId, array $data, User $user): SalesBooking
    {
        return DB::transaction(function () use ($bookingId, $data, $user) {
            $booking = SalesBooking::lockForUpdate()->findOrFail($bookingId);
            if ($booking->status !== 'ACTIVE') {
                throw new PosRuleException("Booking {$booking->booking_number} tidak aktif sehingga tidak dapat dibatalkan.");
            }

            $dp = (float) $booking->dp_amount;
            (new JournalDraft())
                ->debit(PosAccounts::CUSTOMER_DEPOSIT, $dp, "Pengembalian DP {$booking->customer_name}")
                ->credit($data['refund_account_code'], $dp, "Refund DP booking {$booking->booking_number}")
                ->post($this->engine, 'BOOKING_DP_REFUND', $booking->booking_number, "Pembatalan booking {$booking->booking_number}: ".($data['reason'] ?? 'dibatalkan pelanggan'));

            $booking->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
                'notes' => trim(($booking->notes ? $booking->notes.' | ' : '').'Dibatalkan oleh '.$user->name.': '.($data['reason'] ?? '-')),
            ]);

            return $booking->fresh();
        });
    }
}
