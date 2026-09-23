<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    use HasFactory;

    protected $table = 'journal_entries';

    protected $fillable = [
        'entry_number',
        'entry_date',
        'reference_type',
        'reference_id',
        'description',
        'total_debit',
        'total_credit',
        'status',
        'branch_id',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'total_debit' => 'decimal:2',
        'total_credit' => 'decimal:2',
        'branch_id' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(JournalItem::class);
    }

    /**
     * Bentuk jurnal untuk frontend (disalin ke tampilan akuntansi selama masa transisi).
     */
    public function toApiArray(): array
    {
        $this->loadMissing('items.account');

        return [
            'entry_number' => $this->entry_number,
            'entry_date' => $this->entry_date?->toDateString(),
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'description' => $this->description,
            'total_debit' => (float) $this->total_debit,
            'total_credit' => (float) $this->total_credit,
            'lines' => $this->items->map(fn (JournalItem $item) => [
                'account_code' => $item->account?->account_code,
                'account_name' => $item->account?->account_name,
                'debit' => (float) $item->debit,
                'credit' => (float) $item->credit,
                'note' => $item->note,
            ])->values()->all(),
        ];
    }
}
