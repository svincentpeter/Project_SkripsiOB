<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasFactory;

    protected $table = 'stock_movements';

    // stock_movements does not have updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'product_id',
        'movement_type',
        'quantity',
        'balance_after',
        'reference_type',
        'reference_id',
        'description',
        'operator_name',
        'branch_id',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'balance_after' => 'integer',
        'branch_id' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
