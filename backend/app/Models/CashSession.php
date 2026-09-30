<?php

namespace App\Models;

use App\Services\Accounting\CashSessionService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Shift kasir untuk satu laci (akun 1-1000). Jendela shift = jurnal dengan id di (from_entry_id, to_entry_id].
 */
class CashSession extends Model
{
    public const OPEN = 'OPEN';

    public const PENDING = 'PENDING_APPROVAL';

    public const CLOSED = 'CLOSED';

    protected $fillable = [
        'user_id',
        'opened_at',
        'opening_float',
        'book_opening',
        'opening_note',
        'from_entry_id',
        'to_entry_id',
        'closed_at',
        'closed_by',
        'expected_cash',
        'counted_cash',
        'variance',
        'variance_reason',
        'status',
        'approved_by',
        'approved_at',
        'journal_entry_id',
        'branch_id',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'approved_at' => 'datetime',
        'opening_float' => 'decimal:2',
        'book_opening' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'counted_cash' => 'decimal:2',
        'variance' => 'decimal:2',
        'from_entry_id' => 'integer',
        'to_entry_id' => 'integer',
        'branch_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    /** Kas awal hasil hitung dikurangi saldo buku laci saat shift dibuka. */
    public function openingDifference(): float
    {
        return round((float) $this->opening_float - (float) $this->book_opening, 2);
    }

    /**
     * Nominal jurnal selisih saat disetujui = kas dihitung − (saldo buku awal + mutasi shift)
     * = selisih akhir + selisih kas awal. Null selama shift belum ditutup.
     */
    public function adjustment(): ?float
    {
        return $this->variance === null ? null : round((float) $this->variance + $this->openingDifference(), 2);
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['user', 'closer', 'approver', 'journalEntry']);
        $summary = CashSessionService::summary($this);

        return [
            'id' => $this->id,
            'status' => $this->status,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'opened_at' => $this->opened_at?->toIso8601String(),
            'opening_float' => (float) $this->opening_float,
            'book_opening' => (float) $this->book_opening,
            'opening_difference' => $this->openingDifference(),
            'opening_note' => $this->opening_note,
            'lines' => $summary['lines'],
            'cash_in' => $summary['cash_in'],
            'cash_out' => $summary['cash_out'],
            'expected_cash' => $this->expected_cash !== null ? (float) $this->expected_cash : $summary['expected_cash'],
            'closed_at' => $this->closed_at?->toIso8601String(),
            'closed_by_name' => $this->closer?->name,
            'counted_cash' => $this->counted_cash !== null ? (float) $this->counted_cash : null,
            'variance' => $this->variance !== null ? (float) $this->variance : null,
            'variance_reason' => $this->variance_reason,
            'adjustment' => $this->adjustment(),
            'approved_by_name' => $this->approver?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'journal_entry_number' => $this->journalEntry?->entry_number,
        ];
    }
}
