<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Retur pembelian (kind RETURN) atau pembatalan penerimaan barang (kind CANCEL), bernomor RTB-….
 */
class PurchaseReturn extends Model
{
    protected $fillable = [
        'reference', 'purchase_id', 'kind', 'return_date', 'reason', 'quantity', 'total_amount', 'payable_amount',
        'refund_amount', 'refund_account_code', 'journal_entry_number', 'created_by', 'operator_name',
    ];

    protected $casts = [
        'return_date' => 'date',
        'quantity' => 'integer',
        'total_amount' => 'decimal:2',
        'payable_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'kind' => $this->kind,
            'return_date' => $this->return_date?->toDateString(),
            'reason' => $this->reason,
            'quantity' => $this->quantity,
            'total_amount' => (float) $this->total_amount,
            'payable_amount' => (float) $this->payable_amount,
            'refund_amount' => (float) $this->refund_amount,
            'refund_account_code' => $this->refund_account_code,
            'journal_entry_number' => $this->journal_entry_number,
        ];
    }
}
