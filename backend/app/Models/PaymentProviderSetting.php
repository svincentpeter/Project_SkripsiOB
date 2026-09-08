<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentProviderSetting extends Model
{
    use HasFactory;

    protected $table = 'payment_provider_settings';

    protected $fillable = [
        'method_type',
        'provider_name',
        'provider_code',
        'fee_percentage',
        'fee_threshold_amount',
        'is_active',
        'sort_order',
        'notes',
    ];

    protected $casts = [
        'fee_percentage' => 'decimal:2',
        'fee_threshold_amount' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeBank($query)
    {
        return $query->where('method_type', 'bank')->orderBy('sort_order');
    }

    public function scopeQris($query)
    {
        return $query->where('method_type', 'qris')->orderBy('sort_order');
    }

    /**
     * Hitung fee MDR QRIS.
     * Jika transaksi melebihi threshold dan fee > 0, fee dipotong dari bank toko.
     *
     * @param float $amount
     * @return array ['fee_percentage' => float, 'fee_amount' => float, 'net_received' => float]
     */
    public function calculateQrisFee(float $amount): array
    {
        $pct = (float) $this->fee_percentage;
        $threshold = (float) $this->fee_threshold_amount;

        if ($amount > $threshold && $pct > 0) {
            $feeAmount = round($amount * ($pct / 100));
            return [
                'fee_percentage' => $pct,
                'fee_amount' => $feeAmount,
                'net_received' => max(0, $amount - $feeAmount),
            ];
        }

        return [
            'fee_percentage' => 0.00,
            'fee_amount' => 0.00,
            'net_received' => $amount,
        ];
    }
}
