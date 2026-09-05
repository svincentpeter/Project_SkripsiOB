<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ManualJournalRequest;
use App\Http\Requests\PayDebtRequest;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\ProductBatch;
use App\Models\Supplier;
use App\Services\AccountingEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountingReportController extends Controller
{
    protected AccountingEngine $accountingEngine;

    public function __construct(AccountingEngine $accountingEngine)
    {
        $this->accountingEngine = $accountingEngine;
    }

    public function journals(Request $request): JsonResponse
    {
        $query = JournalEntry::with(['items.account'])
            ->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('type')) {
            $query->where('reference_type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('entry_number', 'like', "%{$s}%")
                  ->orWhere('reference_id', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        if ($request->filled('start_date')) {
            $query->where('entry_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->where('entry_date', '<=', $request->end_date);
        }

        $journals = $query->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $journals,
        ]);
    }

    public function createManualJournal(ManualJournalRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $refId = 'MEMO-' . date('Ymd-His');
        $journal = $this->accountingEngine->createEntry(
            'MANUAL_ADJUSTMENT',
            $refId,
            $validated['description'],
            $validated['items'],
            $validated['date'],
            3
        );

        return response()->json([
            'success' => true,
            'message' => 'Jurnal penyesuaian memorial berhasil dicatat',
            'data' => $journal,
        ], 201);
    }

    public function generalLedger(Request $request): JsonResponse
    {
        $accountCode = $request->input('account_code', '1-1000');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $ledger = $this->accountingEngine->getGeneralLedger($accountCode, $startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $ledger,
        ]);
    }

    public function trialBalance(): JsonResponse
    {
        $tb = $this->accountingEngine->getTrialBalance();

        return response()->json([
            'success' => true,
            'data' => $tb,
        ]);
    }

    public function financialStatements(): JsonResponse
    {
        $statements = $this->accountingEngine->getFinancialStatements();

        return response()->json([
            'success' => true,
            'data' => $statements,
        ]);
    }

    public function accountsPayable(): JsonResponse
    {
        // Compute supplier debts from batches purchased with TEMPO or remaining amounts
        $suppliers = Supplier::where('is_active', true)->get();

        $debts = [];
        $totalOutstanding = 0.00;

        foreach ($suppliers as $sup) {
            // Find total credit for this supplier from product batches or journals
            $totalPurchased = (float) ProductBatch::where('source_name', 'like', "%{$sup->supplier_name}%")->sum(DB::raw('initial_qty * batch_cost'));

            // Find payments made
            $totalPaid = (float) JournalEntry::where('reference_type', 'DEBT_PAYMENT')
                ->where('description', 'like', "%{$sup->supplier_name}%")
                ->sum('total_debit');

            $balance = max(0, $totalPurchased - $totalPaid);
            $totalOutstanding += $balance;

            $debts[] = [
                'supplier_id' => $sup->id,
                'supplier_name' => $sup->supplier_name,
                'supplier_code' => $sup->supplier_code,
                'phone' => $sup->phone,
                'total_purchased' => round($totalPurchased, 2),
                'total_paid' => round($totalPaid, 2),
                'remaining_debt' => round($balance, 2),
                'status' => $balance > 0 ? 'BELUM_LUNAS' : 'LUNAS',
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_outstanding' => round($totalOutstanding, 2),
                'suppliers' => $debts,
            ]
        ]);
    }

    public function payDebt(PayDebtRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $supplier = Supplier::findOrFail($validated['supplier_id']);
        $amount = (float) $validated['amount'];
        $date = $validated['payment_date'] ?? now()->toDateString();

        $journal = DB::transaction(function () use ($supplier, $amount, $date, $validated) {
            $refId = 'PAY-DEBT-' . date('Ymd-His');

            // [DEBIT] Hutang Dagang Supplier (2-1000)
            $accAp = Account::where('account_code', '2-1000')->firstOrFail();

            // [KREDIT] Kas Laci (1-1000) or Bank BCA (1-1001)
            $creditAccCode = in_array($validated['payment_method'], ['KAS_LACI', 'TUNAI']) ? '1-1000' : '1-1001';
            $accCashBank = Account::where('account_code', $creditAccCode)->firstOrFail();

            $items = [
                [
                    'account_id' => $accAp->id,
                    'debit' => $amount,
                    'credit' => 0.00,
                    'note' => "Pelunasan Hutang Distributor {$supplier->supplier_name}",
                ],
                [
                    'account_id' => $accCashBank->id,
                    'debit' => 0.00,
                    'credit' => $amount,
                    'note' => "Pembayaran {$validated['payment_method']} untuk pelunasan hutang",
                ],
            ];

            return $this->accountingEngine->createEntry(
                'DEBT_PAYMENT',
                $refId,
                "Pelunasan Hutang Supplier {$supplier->supplier_name}" . ($validated['notes'] ? " ({$validated['notes']})" : ""),
                $items,
                $date,
                3
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Pelunasan hutang berhasil dicatat dan dibukukan ke jurnal',
            'data' => $journal,
        ]);
    }
}
