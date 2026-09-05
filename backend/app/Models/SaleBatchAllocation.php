<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleBatchAllocation extends Model
{
    use HasFactory;

    protected $table = 'sale_batch_allocations';

    protected $fillable = [
        'sale_detail_id',
        'product_batch_id',
        'quantity_allocated',
        'unit_cost',
        'total_cost',
    ];

    protected $casts = [
        'quantity_allocated' => 'integer',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    public function saleDetail(): BelongsTo
    {
        return $this->belongsTo(SaleDetail::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ProductBatch::class, 'product_batch_id');
    }
}
