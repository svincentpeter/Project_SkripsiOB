<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu mutasi rekening koran Bank BCA. amount positif = uang masuk ke bank, negatif = keluar.
 * journal_item_id terisi bila sudah dicocokkan dengan baris jurnal akun 1-1001.
 */
class BankStatementLine extends Model
{
    protected $fillable = ['statement_date', 'description', 'amount', 'source', 'journal_item_id', 'created_by', 'branch_id'];

    protected $casts = [
        'statement_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function journalItem(): BelongsTo
    {
        return $this->belongsTo(JournalItem::class);
    }

    public function toApiArray(): array
    {
        $this->loadMissing('journalItem.journalEntry');
        $entry = $this->journalItem?->journalEntry;

        return [
            'id' => $this->id,
            'statement_date' => $this->statement_date->toDateString(),
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'source' => $this->source,
            'journal_item_id' => $this->journal_item_id,
            'matched_entry_number' => $entry?->entry_number,
            'matched_reference_type' => $entry?->reference_type,
            'matched_entry_date' => $entry?->entry_date?->toDateString(),
        ];
    }
}
