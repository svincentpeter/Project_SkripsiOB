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
        'old_cost',
        'new_cost',
        'old_price',
        'new_price',
        'cost_change_percent',
        'price_change_percent',
        'change_source',
        'changed_field',
        'context_month',
        'changed_by',
        'reason',
    ];

    protected $casts = [
        'old_cost' => 'decimal:2',
        'new_cost' => 'decimal:2',
        'old_price' => 'decimal:2',
        'new_price' => 'decimal:2',
        'cost_change_percent' => 'decimal:2',
        'price_change_percent' => 'decimal:2',
        'product_id' => 'integer',
        'changed_by' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
