<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    protected $fillable = [
        'purchase_number', 'supplier_id', 'supplier_name', 'supplier_invoice', 'purchase_date',
        'payment_method', 'due_date', 'total_amount', 'dpp_amount', 'ppn_amount', 'paid_amount', 'returned_amount', 'status',
        'journal_entry_number', 'notes', 'operator_name',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'dpp_amount' => 'decimal:2',
        'ppn_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'returned_amount' => 'decimal:2',
    ];

    public function payments(): HasMany
    {
        return $this->hasMany(PurchasePayment::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(ProductBatch::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class);
    }

    /** Sisa hutang = total − nilai retur − dibayar bersih (refund supplier sudah mengurangi paid_amount). */
    public function remaining(): float
    {
        return round((float) $this->total_amount - (float) $this->returned_amount - (float) $this->paid_amount, 2);
    }

    public function toApiArray(): array
    {
        $items = $this->batches
            ->groupBy('product_id')
            ->map(function ($group, $productId) {
                $first = $group->first();
                return [
                    'product_id' => (int) $productId,
                    'product_name' => $first?->product?->product_name ?? "Produk #{$productId}",
                    'product_size' => $first?->product?->product_size,
                    'quantity' => (int) $group->sum('initial_qty'),
                    'returnable_qty' => (int) $group->sum('remaining_qty'),
                    'total_cost' => round($group->sum(fn ($b) => (int) $b->initial_qty * (float) $b->batch_cost), 2),
                ];
            })
            ->values()
            ->all();

        $firstProductName = $items[0]['product_name'] ?? $this->batches->first()?->product?->product_name;
        $productLabel = count($items) > 1 && $firstProductName
            ? "{$firstProductName} (+".(count($items) - 1).' produk)'
            : $firstProductName;

        return [
            'id' => $this->id,
            'purchase_number' => $this->purchase_number,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier_name,
            'supplier_invoice' => $this->supplier_invoice,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'payment_method' => $this->payment_method,
            'due_date' => $this->due_date?->toDateString(),
            'total_amount' => (float) $this->total_amount,
            'dpp_amount' => (float) $this->dpp_amount,
            'ppn_amount' => (float) $this->ppn_amount,
            'paid_amount' => (float) $this->paid_amount,
            'returned_amount' => (float) $this->returned_amount,
            'remaining_amount' => $this->remaining(),
            'product_name' => $productLabel,
            'item_count' => count($items),
            'items' => $items,
            'quantity' => (int) $this->batches->sum('initial_qty'),
            'returnable_qty' => (int) $this->batches->sum('remaining_qty'),
            'status' => $this->status,
            'journal_entry_number' => $this->journal_entry_number,
            'notes' => $this->notes,
        ];
    }
}
