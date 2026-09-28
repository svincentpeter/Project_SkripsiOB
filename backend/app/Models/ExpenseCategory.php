<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    use HasFactory;

    protected $table = 'expense_categories';

    protected $fillable = [
        'category_code',
        'category_name',
        'default_account_code',
    ];

    /** @return array{id: int, code: string, name: string, account_code: string} */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->category_code,
            'name' => $this->category_name,
            'account_code' => $this->default_account_code,
        ];
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'category_id');
    }
}
