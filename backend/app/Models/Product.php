<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';

    protected $fillable = [
        'product_name',
        'product_code',
        'barcode',
        'brand',
        'size_width',
        'size_ratio',
        'ring',
        'product_size',
        'motif',
        'condition_code',
        'product_year',
        'product_cost',
        'product_price',
        'product_quantity',
        'product_stock_alert',
        'branch_id',
    ];

    protected $casts = [
        'product_cost' => 'decimal:2',
        'product_price' => 'decimal:2',
        'product_quantity' => 'integer',
        'product_stock_alert' => 'integer',
        'branch_id' => 'integer',
    ];

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
