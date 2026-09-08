<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'products';

    protected $fillable = [
        'product_name',
        'product_code',
        'barcode',
        'brand',
        'brand_id',
        'category_id',
        'size_width',
        'size_ratio',
        'ring',
        'product_size',
        'motif',
        'condition_code',
        'product_year',
        'product_cost',
        'product_price',
        'reference_price',
        'product_quantity',
        'stok_awal',
        'product_stock_alert',
        'is_active',
        'is_old_stock',
        'branch_id',
    ];

    protected $casts = [
        'product_cost' => 'decimal:2',
        'product_price' => 'decimal:2',
        'reference_price' => 'decimal:2',
        'product_quantity' => 'integer',
        'stok_awal' => 'integer',
        'product_stock_alert' => 'integer',
        'branch_id' => 'integer',
        'brand_id' => 'integer',
        'category_id' => 'integer',
        'is_active' => 'boolean',
        'is_old_stock' => 'boolean',
    ];

    public function brandRelation(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function priceAudits(): HasMany
    {
        return $this->hasMany(ProductPriceAudit::class, 'product_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(ProductBatch::class);
    }

    public function activeBatches(): HasMany
    {
        return $this->hasMany(ProductBatch::class)
            ->where('remaining_qty', '>', 0)
            ->orderBy('purchase_date', 'asc')
            ->orderBy('id', 'asc');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function saleDetails(): HasMany
    {
        return $this->hasMany(SaleDetail::class);
    }
}
