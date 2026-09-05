<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductBatch extends Model
{
    use HasFactory;

    protected $table = 'product_batches';

    protected $fillable = [
        'product_id',
        'batch_code',
        'source_name',
        'purchase_date',
        'batch_cost',
        'initial_qty',
        'remaining_qty',
        'branch_id',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'batch_cost' => 'decimal:2',
        'initial_qty' => 'integer',
        'remaining_qty' => 'integer',
        'branch_id' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(SaleBatchAllocation::class);
    }
}
