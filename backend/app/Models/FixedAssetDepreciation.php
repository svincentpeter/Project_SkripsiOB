<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Penyusutan satu aset untuk satu bulan, bagian dari satu jurnal DEPRECIATION.
 */
class FixedAssetDepreciation extends Model
{
    protected $fillable = ['fixed_asset_id', 'period', 'amount', 'journal_entry_id'];

    protected $casts = ['amount' => 'decimal:2'];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class, 'fixed_asset_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
