<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\Accounting\CashMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashMovementController extends Controller
{
    public function index(): JsonResponse
    {
        // ponytail: 50 mutasi terbaru; riwayat lengkap ada di Jurnal Umum (filter "Kas & Modal").
        $rows = JournalEntry::with(['items.account', 'reversal', 'reversalOf', 'creator'])
            ->whereIn('reference_type', array_values(CashMovementService::TYPES))
            ->orderByDesc('entry_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (JournalEntry $j) => $j->toApiArray())->values()]);
    }

    public function store(Request $request, CashMovementService $movements): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(CashMovementService::TYPES))],
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'amount' => 'required|numeric|min:1|max:999999999999',
            'account_code' => ['nullable', 'required_unless:type,DEPOSIT', Rule::in([CashMovementService::CASH, CashMovementService::BANK])],
            'description' => 'required|string|max:255',
        ], [
            'account_code.required_unless' => 'Pilih sumber atau tujuan dana: kas laci (1-1000) atau bank (1-1001).',
            'type.in' => 'Jenis mutasi kas tidak dikenal.',
        ]);

        $journal = $movements->create($data);

        return response()->json([
            'success' => true,
            'message' => "Mutasi kas {$journal->reference_id} dibukukan ({$journal->entry_number}).",
            'data' => $journal->toApiArray(),
        ], 201);
    }
}
