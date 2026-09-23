<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\Pos\PosAccounts;
use App\Services\Pos\ReceivableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReceivableController extends Controller
{
    public function index(Request $request, ReceivableService $receivables): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $receivables->list($request->input('status', 'open') !== 'all'),
        ]);
    }

    public function pay(Request $request, int $saleId, ReceivableService $receivables): JsonResponse
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
            'account_code' => ['required', Rule::in([PosAccounts::CASH, PosAccounts::BANK])],
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);

        $sale = $receivables->pay($saleId, $data, $request->user());
        $payment = $sale->receivablePayments()->latest('id')->first();

        return response()->json([
            'success' => true,
            'message' => "Pelunasan piutang {$sale->reference} tercatat.",
            'data' => [
                'receivable' => ReceivableService::toArray($sale),
                'journal' => JournalEntry::where('entry_number', $payment->journal_entry_number)->first()?->toApiArray(),
            ],
        ], 201);
    }
}
