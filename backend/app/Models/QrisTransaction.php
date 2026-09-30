<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Order QRIS dinamis Midtrans. Dibuat saat charge (pending, nominal tagihan), ditandai lunas oleh webhook
 * bertanda tangan, cek status ke Midtrans, atau simulasi demo, dan dikunci ke satu baris pembayaran nota.
 */
class QrisTransaction extends Model
{
    public const SOURCE_WEBHOOK = 'WEBHOOK';
    public const SOURCE_STATUS_API = 'STATUS_API';
    public const SOURCE_SIMULATION = 'SIMULATION';

    protected $fillable = [
        'order_id', 'gross_amount', 'transaction_status', 'settlement_source', 'settled_at', 'sale_payment_id',
    ];

    protected $casts = [
        'gross_amount' => 'decimal:2',
        'settled_at' => 'datetime',
    ];

    public function isSettled(): bool
    {
        return $this->transaction_status === 'settlement';
    }

    /** Bentuk respons endpoint status/simulasi QRIS. */
    public function toStatusArray(): array
    {
        return [
            'order_id' => $this->order_id,
            'transaction_status' => $this->transaction_status,
            'payment_type' => 'qris',
            'gross_amount' => (int) round((float) $this->gross_amount),
            'settlement_time' => $this->settled_at?->toIso8601String(),
            'is_simulated' => $this->settlement_source === self::SOURCE_SIMULATION,
        ];
    }
}
