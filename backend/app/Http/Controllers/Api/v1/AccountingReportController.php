<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ManualJournalRequest;
use App\Http\Requests\PayDebtRequest;
use App\Models\JournalEntry;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\Accounting\ManualJournalService;
use App\Services\Inventory\PayableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountingReportController extends Controller
{
    public function journals(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'types' => 'nullable|string|max:300',
            'search' => 'nullable|string|max:100',
            'account_code' => 'nullable|string|exists:accounts,account_code',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = JournalEntry::query()
            ->where('status', 'POSTED')
            ->when($data['start_date'] ?? null, fn ($q, $d) => $q->where('entry_date', '>=', $d))
            ->when($data['end_date'] ?? null, fn ($q, $d) => $q->where('entry_date', '<=', $d))
            ->when($data['types'] ?? null, fn ($q, $types) => $q->whereIn('reference_type', explode(',', $types)))
            ->when($data['account_code'] ?? null, fn ($q, $code) => $q->whereHas('items.account', fn ($a) => $a->where('account_code', $code)))
            ->when($data['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('entry_number', 'like', "%{$s}%")
                ->orWhere('reference_id', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")));

        $totals = (clone $query)->selectRaw('COALESCE(SUM(total_debit), 0) as d, COALESCE(SUM(total_credit), 0) as c')->first();
        $page = $query->with(['items.account', 'reversal', 'reversalOf', 'creator'])
            ->orderByDesc('entry_date')->orderByDesc('id')
            ->paginate($data['per_page'] ?? 25);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $page->getCollection()->map(fn (JournalEntry $j) => $j->toApiArray())->values(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'total_debit' => round((float) $totals->d, 2),
                'total_credit' => round((float) $totals->c, 2),
            ],
        ]);
    }

    public function createManualJournal(ManualJournalRequest $request, ManualJournalService $manual): JsonResponse
    {
        $journal = $manual->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => "Jurnal penyesuaian {$journal->entry_number} dibukukan.",
            'data' => $journal->toApiArray(),
        ], 201);
    }

    public function reverseJournal(Request $request, string $entryNumber, ManualJournalService $manual): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255']);
        $entry = JournalEntry::where('entry_number', $entryNumber)->firstOrFail();
        $reversal = $manual->reverse($entry, $data['reason']);

        return response()->json([
            'success' => true,
            'message' => "Jurnal {$entry->entry_number} dibalik dengan {$reversal->entry_number}.",
            'data' => $reversal->toApiArray(),
        ], 201);
    }

    public function generalLedger(Request $request, FinancialReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'account_code' => 'required|string|exists:accounts,account_code',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('start_date'), 'after_or_equal:start_date')],
        ]);

        return response()->json([
            'success' => true,
            'data' => $reports->generalLedger($data['account_code'], $data['start_date'] ?? null, $data['end_date'] ?? null),
        ]);
    }

    public function trialBalance(Request $request, FinancialReportService $reports): JsonResponse
    {
        $data = $request->validate(['as_of' => 'nullable|date_format:Y-m-d']);

        return response()->json([
            'success' => true,
            'data' => $reports->trialBalance($data['as_of'] ?? now()->toDateString()),
        ]);
    }

    public function financialStatements(Request $request, FinancialReportService $reports): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json(['success' => true, 'data' => $reports->financialStatements($from, $to)]);
    }

    public function cashFlow(Request $request, CashFlowReport $cashFlow): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json(['success' => true, 'data' => $cashFlow->build($from, $to)]);
    }

    /** Saldo kas laci & bank hari ini (dipakai form beban untuk cek saldo). */
    public function cashBalances(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => CashFlowReport::cashBalances(now()->toDateString())]);
    }

    /**
     * Rentang laporan; tanpa end_date = hari ini, tanpa start_date = sejak awal pembukuan.
     *
     * @return array{0: ?string, 1: string}
     */
    private function range(Request $request): array
    {
        $data = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('start_date'), 'after_or_equal:start_date')],
        ]);

        return [$data['start_date'] ?? null, $data['end_date'] ?? now()->toDateString()];
    }

    /**
     * Hutang supplier per pemasok, dihitung dari faktur pembelian TEMPO.
     */
    public function accountsPayable(): JsonResponse
    {
        $rows = Purchase::where('payment_method', 'TEMPO')
            ->selectRaw('supplier_id, supplier_name, SUM(total_amount - returned_amount) as purchased, SUM(paid_amount) as paid')
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
