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

    public function toApiArray(): array
    {
        $journals = JournalEntry::with('items.account')
            ->where('reference_id', $this->booking_number)
            ->whereIn('reference_type', ['BOOKING_DP', 'BOOKING_DP_REFUND'])
            ->orderBy('id')
            ->get();

        return [
            'id' => $this->id,
            'booking_number' => $this->booking_number,
            'date' => $this->date?->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'vehicle_plate' => $this->vehicle_plate,
            'vehicle_model' => $this->vehicle_model,
            'items' => $this->items ?? [],
            'estimated_total' => (float) $this->estimated_total,
            'dp_amount' => (float) $this->dp_amount,
            'remaining_amount' => (float) $this->remaining_amount,
            'payment_method' => $this->payment_method,
            'dp_account_code' => $this->dp_account_code,
            'notes' => $this->notes,
            'status' => $this->status,
            'converted_sale_id' => $this->converted_sale_id,
            'journals' => $journals->map(fn (JournalEntry $j) => $j->toApiArray())->values()->all(),
        ];
    }
}
