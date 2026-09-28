<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JournalEntry extends Model
{
    use HasFactory;

    /** Jurnal penyesuaian manual; satu-satunya jenis yang boleh dibalik dari layar jurnal. */
    public const MANUAL = 'MANUAL_ADJUSTMENT';

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
        'created_by',
        'reversal_of_id',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Jurnal asal yang dibalik oleh jurnal ini. */
    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    /** Jurnal pembalik untuk jurnal ini (maksimal satu). */
    public function reversal(): HasOne
    {
        return $this->hasOne(self::class, 'reversal_of_id');
    }

    /**
     * Baris jurnal dengan debit & kredit ditukar, siap dikirim ke AccountingEngine::createEntry.
     *
     * @return list<array{account_id: int, debit: float, credit: float, note: string}>
     */
    public function reversedItems(string $notePrefix): array
    {
        return $this->items()->get()->map(fn (JournalItem $item) => [
            'account_id' => $item->account_id,
            'debit' => (float) $item->credit,
            'credit' => (float) $item->debit,
            'note' => $notePrefix.$item->note,
        ])->all();
    }

    /**
     * Bentuk jurnal untuk frontend.
     */
    public function toApiArray(): array
    {
        $this->loadMissing(['items.account', 'reversal', 'reversalOf', 'creator']);

        return [
            'id' => $this->id,
            'entry_number' => $this->entry_number,
            'entry_date' => $this->entry_date?->toDateString(),
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'description' => $this->description,
            'total_debit' => (float) $this->total_debit,
            'total_credit' => (float) $this->total_credit,
            'reversal_of' => $this->reversalOf?->entry_number,
            'reversed_by' => $this->reversal?->entry_number,
            'can_reverse' => $this->reference_type === self::MANUAL && $this->reversal === null,
            'created_by_name' => $this->creator?->name,
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
