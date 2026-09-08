<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EdcSetting extends Model
{
    use HasFactory;

    protected $table = 'edc_settings';

    protected $fillable = [
        'bank_name',
        'payment_type',
        'fee_percentage',
        'charge_to_customer',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'fee_percentage' => 'decimal:2',
        'charge_to_customer' => 'boolean',
        'is_active' => 'boolean',
    ];

    const TYPE_DEBIT = 'Debit';
    const TYPE_CREDIT = 'Credit';

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function getFee(string $bank, string $type): ?self
    {
        return static::where('bank_name', $bank)
            ->where('payment_type', $type)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Hitung fee & tagihan dari nominal pokok (Debit).
     * Fee dipotong dari toko:
     * Fee = round(Pokok * fee% / 100)
     * Toko terima = Pokok - Fee
     */
    public static function calculateFeeFromBase(string $bank, string $type, float $baseAmount): array
    {
        $setting = static::getFee($bank, $type);

        if (!$setting || (float) $setting->fee_percentage <= 0 || $baseAmount <= 0) {
            return [
                'fee_percentage' => $setting ? (float) $setting->fee_percentage : 0.00,
                'fee_amount' => 0.00,
                'surcharge_amount' => 0.00,
                'total_charged' => max(0, $baseAmount),
                'net_received' => max(0, $baseAmount),
                'found' => (bool) $setting,
            ];
        }

        $pct = (float) $setting->fee_percentage;
        $feeAmount = round($baseAmount * ($pct / 100));

        return [
            'fee_percentage' => $pct,
            'fee_amount' => $feeAmount,
            'surcharge_amount' => 0.00,
            'total_charged' => $baseAmount,
            'net_received' => max(0, $baseAmount - $feeAmount),
            'found' => true,
        ];
    }

    /**
     * Hitung surcharge & total tagihan (Credit).
     * Surcharge dibebankan ke customer:
     * Surcharge = round(Pokok * fee% / 100)
     * Total Gesek = Pokok + Surcharge
     * Toko terima = Pokok (karena surcharge mengimbangi MDR bank)
     */
    public static function calculateCreditSurcharge(string $bank, float $baseAmount): array
    {
        $setting = static::getFee($bank, self::TYPE_CREDIT);

        if (!$setting || (float) $setting->fee_percentage <= 0 || $baseAmount <= 0) {
            return [
                'fee_percentage' => $setting ? (float) $setting->fee_percentage : 0.00,
                'fee_amount' => 0.00,
                'surcharge_amount' => 0.00,
                'total_swiped' => max(0, $baseAmount),
                'net_received' => max(0, $baseAmount),
                'found' => (bool) $setting,
            ];
        }

        $pct = (float) $setting->fee_percentage;
        $surcharge = round($baseAmount * ($pct / 100));
        $totalSwiped = $baseAmount + $surcharge;

        return [
            'fee_percentage' => $pct,
            'fee_amount' => $surcharge, // Store MDR cost
            'surcharge_amount' => $surcharge, // Customer paid surcharge
            'total_swiped' => $totalSwiped,
            'net_received' => $baseAmount,
            'found' => true,
        ];
    }
}
