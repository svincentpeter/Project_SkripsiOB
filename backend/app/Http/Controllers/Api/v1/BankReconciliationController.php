<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Accounting\BankReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankReconciliationController extends Controller
{
    public function __construct(private readonly BankReconciliationService $bank)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);

        return response()->json(['success' => true, 'data' => $this->bank->report($data['period'])]);
    }

    public function updateBalance(Request $request, string $period): JsonResponse
    {
        $request->merge(['period' => $period]);
        $data = $request->validate([
            'period' => 'date_format:Y-m',
            'statement_ending_balance' => 'required|numeric|min:-100000000000|max:100000000000',
        ]);
        $this->bank->setStatementBalance($period, (float) $data['statement_ending_balance'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Saldo akhir rekening koran {$period} disimpan.",
            'data' => $this->bank->report($period),
        ]);
    }

    public function storeLine(Request $request): JsonResponse
    {
        $data = $request->validate([
            'statement_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|not_in:0|min:-10000000000|max:10000000000',
        ], ['amount.not_in' => 'Nominal mutasi tidak boleh nol.']);

        return response()->json([
            'success' => true,
            'message' => 'Mutasi rekening koran disimpan.',
            'data' => $this->bank->addLine($data, $request->user())->toApiArray(),
        ], 201);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:1024|mimes:csv,txt']);
        $result = $this->bank->import($request->file('file')->get(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "{$result['imported']} mutasi diimpor, {$result['skipped']} dilewati karena sudah ada.",
            'data' => $result,
        ], 201);
    }

    public function autoMatch(Request $request): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);
        $matched = $this->bank->autoMatch($data['period']);

        return response()->json(['success' => true, 'message' => "{$matched} mutasi dicocokkan otomatis.", 'data' => ['matched' => $matched]]);
    }

    public function destroyLine(int $id): JsonResponse
    {
        $this->bank->deleteLine($id);

        return response()->json(['success' => true, 'message' => 'Mutasi rekening koran dihapus.', 'data' => null]);
    }

    public function match(Request $request, int $id): JsonResponse
    {
        // journal_item_ids: satu mutasi gabungan (mis. setoran QRIS harian) untuk beberapa baris jurnal.
        $data = $request->validate([
            'journal_item_id' => 'required_without:journal_item_ids|integer',
            'journal_item_ids' => 'required_without:journal_item_id|array|min:1|max:200',
            'journal_item_ids.*' => 'integer|distinct',
        ]);
        $ids = $data['journal_item_ids'] ?? [(int) $data['journal_item_id']];

        return response()->json(['success' => true, 'data' => $this->bank->match($id, $ids)->toApiArray()]);
    }

    public function unmatch(int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->bank->unmatch($id)->toApiArray()]);
    }

    public function postAdjustment(int $id): JsonResponse
    {
        $entry = $this->bank->postAdjustment($id);

        return response()->json([
            'success' => true,
            'message' => "Jurnal {$entry->entry_number} dibukukan dari rekening koran.",
            'data' => ['journals' => [$entry->toApiArray()]],
        ], 201);
    }
}
