<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpeningReceivable extends Model
{
    protected $fillable = [
        'receivable_number',
        'customer_name',
        'customer_phone',
        'invoice_number',
        'receivable_date',
        'due_date',
        'total_amount',
        'paid_amount',
        'status',
        'journal_entry_number',
        'notes',
        'operator_name',
    ];

    protected $casts = [
        'receivable_date' => 'date',
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function payments(): HasMany
    {
        return $this->hasMany(OpeningReceivablePayment::class);
    }

    public function remaining(): float
    {
        return round((float) $this->total_amount - (float) $this->paid_amount, 2);
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'receivable_number' => $this->receivable_number,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'invoice_number' => $this->invoice_number,
            'receivable_date' => $this->receivable_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'remaining_amount' => $this->remaining(),
            'status' => $this->status,
            'journal_entry_number' => $this->journal_entry_number,
            'notes' => $this->notes,
            'operator_name' => $this->operator_name,
            'payments' => $this->relationLoaded('payments')
                ? $this->payments->map(fn (OpeningReceivablePayment $p) => $p->toApiArray())->values()->all()
                : [],
        ];
    }
}
