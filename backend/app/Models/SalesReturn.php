<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Retur penjualan (RTJ-…): refund tunai dari laci pada satu shift kasir.
 */
class SalesReturn extends Model
{
    protected $fillable = [
        'reference', 'sale_id', 'return_date', 'reason', 'refund_amount', 'cost_amount', 'cash_session_id',
        'journal_entry_number', 'created_by', 'operator_name', 'branch_id',
    ];

    protected $casts = [
        'return_date' => 'date',
        'refund_amount' => 'decimal:2',
        'cost_amount' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesReturnItem::class);
    }

    public function toApiArray(): array
    {
        $this->loadMissing('items');

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'return_date' => $this->return_date?->toDateString(),
            'reason' => $this->reason,
            'refund_amount' => (float) $this->refund_amount,
            'cost_amount' => (float) $this->cost_amount,
            'journal_entry_number' => $this->journal_entry_number,
            'operator_name' => $this->operator_name,
            'items' => $this->items->map(fn (SalesReturnItem $i) => [
                'sale_detail_id' => $i->sale_detail_id,
                'quantity' => $i->quantity,
                'refund_amount' => (float) $i->refund_amount,
                'cost_amount' => (float) $i->cost_amount,
            ])->values()->all(),
        ];
    }
}
