<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu kali tutup buku sampai akhir bulan `period`. Baris yang dibuka kembali (reopened_at terisi) tidak mengunci.
 */
class AccountingPeriodClosing extends Model
{
    protected $fillable = [
        'period', 'end_date', 'closing_entry_id', 'net_income', 'notes', 'closed_by', 'closed_at',
        'reopened_at', 'reopened_by', 'reopen_reason', 'reopen_entry_id',
    ];

    protected $casts = [
        'end_date' => 'date',
        'net_income' => 'decimal:2',
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
    ];

    public function closingEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'closing_entry_id');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['closingEntry', 'closedByUser']);

        return [
            'period' => $this->period,
            'end_date' => $this->end_date->toDateString(),
            'closing_entry_number' => $this->closingEntry?->entry_number,
            'net_income' => (float) $this->net_income,
            'notes' => $this->notes,
            'closed_by' => $this->closedByUser?->name,
            'closed_at' => $this->closed_at?->toIso8601String(),
            'reopened_at' => $this->reopened_at?->toIso8601String(),
            'reopen_reason' => $this->reopen_reason,
        ];
    }
}
