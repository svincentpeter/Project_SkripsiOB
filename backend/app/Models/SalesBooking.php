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
        'estimated_total',
        'dp_amount',
        'remaining_amount',
        'payment_method',
        'notes',
        'status',
    ];

    protected $casts = [
        'date' => 'date',
        'estimated_total' => 'decimal:2',
        'dp_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];
}
