<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Expense extends Model
{
    use HasFactory;

    protected $table = 'expenses';

    protected $fillable = [
        'reference',
        'expense_date',
        'category_id',
        'amount',
        'payment_method',
        'bank_name',
        'recipient_name',
        'description',
        'attachment_path',
        'approved_by',
        'status',
        'branch_id',
        'void_reason',
        'voided_by',
        'voided_at',
        'created_by',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'decimal:2',
        'branch_id' => 'integer',
        'voided_at' => 'datetime',
    ];

    public function toApiArray(): array
    {
        $this->loadMissing('category');

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'expense_date' => $this->expense_date?->toDateString(),
            'category' => $this->category?->toApiArray(),
            'amount' => (float) $this->amount,
            'payment_method' => $this->payment_method,
            'bank_name' => $this->bank_name,
            'recipient_name' => $this->recipient_name,
            'description' => $this->description,
            'attachment_url' => $this->attachment_path,
            'approved_by' => $this->approved_by,
            'status' => $this->status,
            'void_reason' => $this->void_reason,
            'voided_by' => $this->voided_by,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    public function journalEntry(): HasOne
    {
        return $this->hasOne(JournalEntry::class, 'reference_id', 'reference');
    }
}
