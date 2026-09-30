<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu baris pembayaran nota (Tunai, Transfer atau QRIS). Kolom lama surcharge_amount, edc_bank dan
 * edc_type tetap ada di tabel untuk riwayat, tetapi tidak lagi dipakai.
 */
class SalePayment extends Model
{
    protected $fillable = [
        'sale_id', 'method', 'account_code', 'amount', 'tendered_amount', 'change_amount',
        'fee_percentage', 'fee_amount', 'net_received', 'provider_name', 'reference',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'tendered_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'fee_percentage' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'net_received' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
