<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpeningReceivablePayment extends Model
{
    protected $fillable = [
        'opening_receivable_id',
        'payment_date',
        'amount',
        'account_code',
        'notes',
        'operator_name',
        'journal_entry_number',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function receivable(): BelongsTo
    {
        return $this->belongsTo(OpeningReceivable::class, 'opening_receivable_id');
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'opening_receivable_id' => $this->opening_receivable_id,
            'payment_date' => $this->payment_date?->toDateString(),
            'amount' => (float) $this->amount,
            'account_code' => $this->account_code,
            'notes' => $this->notes,
            'operator_name' => $this->operator_name,
            'journal_entry_number' => $this->journal_entry_number,
        ];
    }
}
