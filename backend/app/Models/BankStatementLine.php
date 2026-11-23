<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu mutasi rekening koran Bank BCA. amount positif = uang masuk ke bank, negatif = keluar.
 * journal_item_id terisi bila sudah dicocokkan dengan baris jurnal akun 1-1001.
 * Mutasi yang dicocokkan ke beberapa baris jurnal ditandai is_split dan diwakili baris anaknya (parent_id),
 * masing-masing cocok 1:1; baris induk tidak ikut laporan maupun pencocokan.
 */
class BankStatementLine extends Model
{
    protected $fillable = ['statement_date', 'description', 'amount', 'source', 'is_split', 'parent_id', 'journal_item_id', 'created_by', 'branch_id'];

    protected $casts = [
        'statement_date' => 'date',
        'amount' => 'decimal:2',
        'is_split' => 'boolean',
    ];

    /** Mutasi yang tampil di laporan dan bisa dicocokkan: semua kecuali induk gabungan. */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('is_split', false);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function journalItem(): BelongsTo
    {
        return $this->belongsTo(JournalItem::class);
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['journalItem.journalEntry', 'parent']);
        $entry = $this->journalItem?->journalEntry;

        return [
            'id' => $this->id,
            'statement_date' => $this->statement_date->toDateString(),
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'source' => $this->source,
            'journal_item_id' => $this->journal_item_id,
            'parent_id' => $this->parent_id,
            'parent_amount' => $this->parent_id === null ? null : (float) $this->parent->amount,
            'matched_entry_number' => $entry?->entry_number,
            'matched_reference_type' => $entry?->reference_type,
            'matched_entry_date' => $entry?->entry_date?->toDateString(),
        ];
    }
}
