<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Bukti Kas Keluar (BKK): Dr akun beban kategori / Cr kas laci atau bank. Pembatalan membukukan jurnal pembalik.
 */
class ExpenseService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public static function cashAccount(string $method): string
    {
        return in_array($method, ['TUNAI', 'KAS_LACI'], true) ? '1-1000' : '1-1001';
    }

    /**
     * @param  array{expense_date: string, category_id: int|string, amount: float|string, payment_method: string, bank_name?: ?string, recipient_name: string, description: string}  $data
     * @return array{expense: Expense, journal: JournalEntry}
     */
    public function create(array $data, ?UploadedFile $attachment, User $user): array
    {
        return DB::transaction(function () use ($data, $attachment, $user) {
            $category = ExpenseCategory::findOrFail($data['category_id']);
            $reference = DocumentNumber::next(Expense::class, 'reference', 'BKK', $data['expense_date']);

            $attachmentPath = null;
            if ($attachment !== null) {
                $name = $reference.'-'.Str::lower(Str::random(6)).'.'.$attachment->extension();
                $attachmentPath = '/storage/'.$attachment->storeAs('expenses', $name, 'public');
            }

            $expense = Expense::create([
                'reference' => $reference,
                'expense_date' => $data['expense_date'],
                'category_id' => $category->id,
                'amount' => round((float) $data['amount'], 2),
                'payment_method' => $data['payment_method'],
                'bank_name' => $data['bank_name'] ?? null,
                'recipient_name' => $data['recipient_name'],
                'description' => $data['description'],
                'attachment_path' => $attachmentPath,
                'approved_by' => $user->name,
                'status' => 'ACTIVE',
                'branch_id' => 3,
                'created_by' => $user->id,
            ]);

            $journal = (new JournalDraft())
                ->debit($category->default_account_code, (float) $expense->amount, "Beban {$category->category_name} ({$reference})")
                ->credit(self::cashAccount($expense->payment_method), (float) $expense->amount, "Dibayar kepada {$expense->recipient_name}")
                ->post($this->engine, 'EXPENSE', $reference, "Pengeluaran {$reference}: {$expense->description}", $data['expense_date']);

            return ['expense' => $expense->load('category'), 'journal' => $journal];
        });
    }

    /**
     * @return array{expense: Expense, journal: JournalEntry}
     */
    public function void(int $id, string $reason, User $user): array
    {
        return DB::transaction(function () use ($id, $reason, $user) {
            $expense = Expense::with('category')->lockForUpdate()->findOrFail($id);
            if ($expense->status === 'VOID') {
                throw new PosRuleException('Pengeluaran ini sudah dibatalkan (VOID).');
            }

            $original = JournalEntry::where('reference_type', 'EXPENSE')->where('reference_id', $expense->reference)->firstOrFail();
            $reversal = $this->engine->createEntry(
                'VOID_EXPENSE',
                'VOID-'.$expense->reference,
                "Pembatalan {$expense->reference}: {$reason}",
                $original->reversedItems('[VOID] '),
                now()->toDateString(),
                3,
                $original->id
            );

            $expense->update(['status' => 'VOID', 'void_reason' => $reason, 'voided_by' => $user->name, 'voided_at' => now()]);

            return ['expense' => $expense->fresh('category'), 'journal' => $reversal];
        });
    }
}
