<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    protected $table = 'accounts';

    // accounts does not have updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'account_code',
        'account_name',
        'account_type',
        'normal_balance',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function journalItems(): HasMany
    {
        return $this->hasMany(JournalItem::class);
    }
}
