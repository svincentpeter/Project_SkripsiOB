<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseRequest;
use App\Models\Account;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Services\AccountingEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    protected AccountingEngine $accountingEngine;

    public function __construct(AccountingEngine $accountingEngine)
    {
        $this->accountingEngine = $accountingEngine;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Expense::with(['category', 'journalEntry'])
            ->orderBy('expense_date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('reference', 'like', "%{$s}%")
                  ->orWhere('recipient_name', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('start_date')) {
            $query->where('expense_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->where('expense_date', '<=', $request->end_date);
        }

        $expenses = $query->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $expenses,
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = ExpenseCategory::orderBy('category_name')->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function show($id): JsonResponse
    {
        $expense = Expense::with(['category', 'journalEntry.items.account'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $expense,
        ]);
    }

    public function store(ExpenseRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = DB::transaction(function () use ($request, $validated) {
            $date = $validated['expense_date'];
            $prefix = 'BKK-' . date('Ym', strtotime($date)) . '-';

            $lastExp = Expense::where('reference', 'like', $prefix . '%')
                ->orderBy('reference', 'desc')
                ->first();

            $seq = 1;
            if ($lastExp) {
                $parts = explode('-', $lastExp->reference);
                $seq = (int) end($parts) + 1;
            }

            $reference = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

            // Handle file upload if present
            $attachmentPath = $validated['attachment_path'] ?? null;
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $filename = 'bkk_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('expenses', $filename, 'public');
                $attachmentPath = '/storage/' . $path;
            }

            $expense = Expense::create([
                'reference' => $reference,
                'expense_date' => $date,
                'category_id' => $validated['category_id'],
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'bank_name' => $validated['bank_name'] ?? null,
                'recipient_name' => $validated['recipient_name'],
                'description' => $validated['description'],
                'attachment_path' => $attachmentPath,
                'approved_by' => $validated['approved_by'] ?? 'Owner Omah Ban',
                'status' => 'ACTIVE',
                'branch_id' => 3,
            ]);

            // Auto-Journaling Double-Entry
            $category = ExpenseCategory::findOrFail($validated['category_id']);
            $expenseAccountCode = $category->default_account_code ?: '6-1000';
            $accExpense = Account::where('account_code', $expenseAccountCode)->first()
                ?? Account::where('account_code', '6-1000')->firstOrFail();

            $creditAccountCode = in_array($validated['payment_method'], ['KAS_LACI', 'TUNAI']) ? '1-1000' : '1-1001';
            $accCredit = Account::where('account_code', $creditAccountCode)->firstOrFail();

            $journalItems = [
                [
                    'account_id' => $accExpense->id,
                    'debit' => (float) $validated['amount'],
                    'credit' => 0.00,
                    'note' => "Beban {$category->category_name} ({$reference})",
                ],
                [
                    'account_id' => $accCredit->id,
                    'debit' => 0.00,
                    'credit' => (float) $validated['amount'],
                    'note' => "Pengeluaran {$validated['payment_method']} untuk {$expense->recipient_name}",
                ],
            ];

            $journal = $this->accountingEngine->createEntry(
                'EXPENSE',
                $reference,
                "Pengeluaran Kas Keluar {$reference}: {$expense->description}",
                $journalItems,
                $date,
                3
            );

            return [
                'expense' => $expense->load('category'),
                'journal_entry_number' => $journal->entry_number,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Pengeluaran kas berhasil dicatat dan dibukukan',
            'data' => [
                'id' => $result['expense']->id,
                'reference' => $result['expense']->reference,
                'amount' => $result['expense']->amount,
                'status' => $result['expense']->status,
                'journal_entry_number' => $result['journal_entry_number'],
                'expense' => $result['expense'],
            ],
        ], 201);
    }

    public function void($id): JsonResponse
    {
        $result = DB::transaction(function () use ($id) {
            $expense = Expense::with('category')->lockForUpdate()->findOrFail($id);

            if ($expense->status === 'VOID') {
                return response()->json([
                    'success' => false,
                    'message' => 'Pengeluaran ini sudah berstatus VOID sebelumnya.',
                ], 422);
            }

            $expense->status = 'VOID';
            $expense->save();

            // Reversal Journal: Debit Kas/Bank, Kredit Beban
            $expenseAccountCode = $expense->category->default_account_code ?? '6-1000';
            $accExpense = Account::where('account_code', $expenseAccountCode)->first()
                ?? Account::where('account_code', '6-1000')->firstOrFail();

            $creditAccountCode = in_array($expense->payment_method, ['KAS_LACI', 'TUNAI']) ? '1-1000' : '1-1001';
            $accCashBank = Account::where('account_code', $creditAccountCode)->firstOrFail();

            $reversalItems = [
                [
                    'account_id' => $accCashBank->id,
                    'debit' => (float) $expense->amount,
                    'credit' => 0.00,
                    'note' => "Pengembalian Dana Kas/Bank BKK {$expense->reference} (VOID)",
                ],
                [
                    'account_id' => $accExpense->id,
                    'debit' => 0.00,
                    'credit' => (float) $expense->amount,
                    'note' => "Jurnal Pembalik Beban {$expense->category->category_name} ({$expense->reference})",
                ],
            ];

            $reversalJournal = $this->accountingEngine->createEntry(
                'VOID_EXPENSE',
                'VOID-' . $expense->reference,
                "Jurnal Pembalik / Pembatalan BKK {$expense->reference}: {$expense->description}",
                $reversalItems,
                now()->toDateString(),
                3
            );

            return [
                'expense' => $expense,
                'reversal_journal_number' => $reversalJournal->entry_number,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Pengeluaran berhasil dibatalkan (VOID) dan Jurnal Pembalik telah diterbitkan',
            'data' => $result['expense'],
        ]);
    }
}
