<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPriceAudit extends Model
{
    use HasFactory;

    protected $table = 'product_price_audits';

    protected $fillable = [
        'product_id',
        'sale_id',
        'sale_detail_id',
        'old_cost',
        'new_cost',
        'reference_hpp',
        'old_price',
        'new_price',
        'cost_change_percent',
        'price_change_percent',
        'markup_percent',
        'change_source',
        'changed_field',
        'context_month',
        'changed_by',
        'actor_name',
        'actor_role',
        'applies_to',
        'reason',
        'is_read_by_owner',
        'is_reviewed_by_owner',
        'reviewed_at',
        'reviewed_by',
        'review_notes',
    ];

    protected $casts = [
        'old_cost' => 'decimal:2',
        'new_cost' => 'decimal:2',
        'reference_hpp' => 'decimal:2',
        'old_price' => 'decimal:2',
        'new_price' => 'decimal:2',
        'cost_change_percent' => 'decimal:2',
        'price_change_percent' => 'decimal:2',
        'markup_percent' => 'decimal:2',
        'product_id' => 'integer',
        'sale_id' => 'integer',
        'sale_detail_id' => 'integer',
        'changed_by' => 'integer',
        'reviewed_by' => 'integer',
        'is_read_by_owner' => 'boolean',
        'is_reviewed_by_owner' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id')->withTrashed();
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['product', 'sale', 'changedByUser', 'reviewer']);
        $hpp = (float) ($this->reference_hpp ?: $this->new_cost ?: $this->old_cost ?: ($this->product?->product_cost ?? 0));
        $newPrice = (float) $this->new_price;
        $markupPct = $this->markup_percent !== null
            ? (float) $this->markup_percent
            : ($hpp > 0 && $newPrice > 0 ? round((($newPrice - $hpp) / $hpp) * 100, 2) : 0.0);

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_code' => $this->product?->product_code,
            'product_name' => $this->product?->product_name ?? 'Produk',
            'brand' => $this->product?->brand,
            'product_size' => $this->product?->product_size,
            'ring' => $this->product?->ring,
            'current_catalog_price' => (float) ($this->product?->product_price ?? 0),
            'sale_id' => $this->sale_id,
            'sale_reference' => $this->sale?->reference,
            'customer_name' => $this->sale?->customer_name,
            'vehicle_plate' => $this->sale?->vehicle_plate,
            'old_cost' => (float) $this->old_cost,
            'new_cost' => (float) $this->new_cost,
            'reference_hpp' => $hpp,
            'min_allowed_price' => round($hpp * (1 + Product::MIN_MARKUP_RATE), 2),
            'old_price' => (float) $this->old_price,
            'new_price' => $newPrice,
            'cost_change_percent' => $this->cost_change_percent !== null ? (float) $this->cost_change_percent : null,
            'price_change_percent' => $this->price_change_percent !== null ? (float) $this->price_change_percent : null,
            'markup_percent' => $markupPct,
            'profit_per_unit' => round($newPrice - $hpp, 2),
            'change_source' => $this->change_source,
            'changed_field' => $this->changed_field,
            'context_month' => $this->context_month,
            'changed_by' => $this->changed_by,
            'actor_name' => $this->actor_name ?? $this->changedByUser?->name ?? 'Sistem',
            'actor_role' => $this->actor_role ?? $this->changedByUser?->role ?? 'OWNER',
            'applies_to' => $this->applies_to ?? 'CATALOG',
            'reason' => $this->reason,
            'is_read_by_owner' => (bool) $this->is_read_by_owner,
            'is_reviewed_by_owner' => (bool) $this->is_reviewed_by_owner,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'reviewed_by_name' => $this->reviewer?->name,
            'review_notes' => $this->review_notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
