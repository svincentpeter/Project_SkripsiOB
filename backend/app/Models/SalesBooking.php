<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesBooking extends Model
{
    use HasFactory;

    protected $table = 'sales_bookings';

    protected $fillable = [
        'booking_number',
        'date',
        'customer_name',
        'customer_phone',
        'vehicle_plate',
        'vehicle_model',
        'items',
        'estimated_total',
        'dp_amount',
        'remaining_amount',
        'payment_method',
        'dp_account_code',
        'notes',
        'status',
        'converted_sale_id',
        'cancelled_at',
        'operator_name',
    ];

    protected $casts = [
        'date' => 'date',
        'items' => 'array',
        'cancelled_at' => 'datetime',
        'estimated_total' => 'decimal:2',
        'dp_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];
}
