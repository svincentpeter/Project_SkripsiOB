<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceMaster extends Model
{
    use HasFactory;

    protected $table = 'service_masters';

    protected $fillable = [
        'service_code',
        'service_name',
        'category',
        'standard_price',
        'cost_price',
        'description',
        'is_active',
    ];

    protected $casts = [
        'standard_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
