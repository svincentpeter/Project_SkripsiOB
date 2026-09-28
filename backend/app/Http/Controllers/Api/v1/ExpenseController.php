<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseRequest;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use App\Services\Accounting\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private readonly ExpenseService $expenses)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:100',
            'category_id' => 'nullable|integer',
            'status' => 'nullable|in:ACTIVE,VOID',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'per_page' => 'nullable|integer|min:1|max:500',
        ]);

        $page = Expense::with('category')
            ->when($data['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('reference', 'like', "%{$s}%")
                ->orWhere('recipient_name', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")))
            ->when($data['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($data['start_date'] ?? null, fn ($q, $d) => $q->where('expense_date', '>=', $d))
            ->when($data['end_date'] ?? null, fn ($q, $d) => $q->where('expense_date', '<=', $d))
            ->orderByDesc('expense_date')->orderByDesc('id')
            ->paginate($data['per_page'] ?? 100);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $page->getCollection()->map(fn (Expense $e) => $e->toApiArray())->values(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ExpenseCategory::orderBy('category_name')->get()->map(fn (ExpenseCategory $c) => $c->toApiArray())->values(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $expense = Expense::with('category')->findOrFail($id);
        $journals = JournalEntry::whereIn('reference_type', ['EXPENSE', 'VOID_EXPENSE'])
            ->whereIn('reference_id', [$expense->reference, 'VOID-'.$expense->reference])
            ->orderBy('id')->get()
            ->map(fn (JournalEntry $j) => $j->toApiArray())->values();

        return response()->json(['success' => true, 'data' => ['expense' => $expense->toApiArray(), 'journals' => $journals]]);
    }

    public function store(ExpenseRequest $request): JsonResponse
    {
        $result = $this->expenses->create($request->validated(), $request->file('attachment'), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Pengeluaran {$result['expense']->reference} dibukukan.",
            'data' => ['expense' => $result['expense']->toApiArray(), 'journals' => [$result['journal']->toApiArray()]],
        ], 201);
    }

    public function void(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255']);
        $result = $this->expenses->void($id, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Pengeluaran {$result['expense']->reference} dibatalkan dan jurnal pembalik dibukukan.",
            'data' => ['expense' => $result['expense']->toApiArray(), 'journals' => [$result['journal']->toApiArray()]],
        ]);
    }
}
