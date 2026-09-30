<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesReturnItem extends Model
{
    protected $fillable = ['sales_return_id', 'sale_detail_id', 'quantity', 'refund_amount', 'cost_amount'];

    protected $casts = [
        'quantity' => 'integer',
        'refund_amount' => 'decimal:2',
        'cost_amount' => 'decimal:2',
    ];
}
