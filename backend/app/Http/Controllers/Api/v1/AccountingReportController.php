<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ManualJournalRequest;
use App\Http\Requests\PayDebtRequest;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Services\AccountingEngine;
use App\Services\Inventory\PayableService;
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

    /**
     * Hutang supplier per pemasok, dihitung dari faktur pembelian TEMPO.
     */
    public function accountsPayable(): JsonResponse
    {
        $rows = Purchase::where('payment_method', 'TEMPO')
            ->selectRaw('supplier_id, supplier_name, SUM(total_amount) as purchased, SUM(paid_amount) as paid')
            ->groupBy('supplier_id', 'supplier_name')
            ->get();

        $debts = $rows->map(function ($row) {
            $supplier = $row->supplier_id ? Supplier::find($row->supplier_id) : null;
            $remaining = round((float) $row->purchased - (float) $row->paid, 2);

            return [
                'supplier_id' => $row->supplier_id,
                'supplier_name' => $row->supplier_name,
                'supplier_code' => $supplier?->supplier_code,
                'phone' => $supplier?->phone,
                'total_purchased' => round((float) $row->purchased, 2),
                'total_paid' => round((float) $row->paid, 2),
                'remaining_debt' => $remaining,
                'status' => $remaining > 0 ? 'BELUM_LUNAS' : 'LUNAS',
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'total_outstanding' => round($debts->sum('remaining_debt'), 2),
                'suppliers' => $debts,
            ],
        ]);
    }

    /**
     * Pembayaran hutang per supplier; dialokasikan ke faktur tempo dengan jatuh tempo terawal.
     */
    public function payDebt(PayDebtRequest $request, PayableService $payables): JsonResponse
    {
        $validated = $request->validated();
        $account = in_array($validated['payment_method'], ['KAS_LACI', 'TUNAI']) ? '1-1000' : '1-1001';

        $journals = $payables->paySupplier(
            (int) $validated['supplier_id'],
            (float) $validated['amount'],
            $account,
            $validated['payment_date'] ?? null,
            $validated['notes'] ?? null,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Pelunasan hutang berhasil dicatat dan dibukukan ke jurnal',
            'data' => array_map(fn ($j) => $j->toApiArray(), $journals),
        ]);
    }
}
