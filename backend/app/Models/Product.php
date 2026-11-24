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

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
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

    public const MIN_MARKUP_RATE = 0.15;

    public function saleDetails(): HasMany
    {
        return $this->hasMany(SaleDetail::class);
    }

    /**
     * HPP patokan penentuan harga jual: nilai tertinggi antara modal terbaru (product_cost)
     * dan modal seluruh batch FIFO aktif (remaining_qty > 0). Menjamin toko tidak kecolongan
     * saat harga beli antar-batch dari supplier berubah.
     */
    public function referenceHpp(): float
    {
        $baseCost = (float) ($this->product_cost ?? 0);
        $batches = $this->relationLoaded('activeBatches')
            ? $this->activeBatches
            : $this->activeBatches()->get();
        $maxBatchCost = (float) ($batches->max('batch_cost') ?? 0);

        return round(max($baseCost, $maxBatchCost), 2);
    }

    /**
     * Standar harga jual minimal: HPP patokan + 15% keuntungan (Markup 1,15 × HPP).
     */
    public function minimumSellingPrice(): float
    {
        return round($this->referenceHpp() * (1 + self::MIN_MARKUP_RATE), 2);
    }
}
