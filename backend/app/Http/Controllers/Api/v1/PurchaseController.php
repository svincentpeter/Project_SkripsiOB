<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Services\Inventory\PayableService;
use App\Services\Inventory\PurchaseReturnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PurchaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $purchases = Purchase::with('batches.product')
            ->when($request->input('status', 'all') === 'open', fn ($q) => $q->where('payment_method', 'TEMPO')->whereNotIn('status', ['LUNAS', 'BATAL']))
            ->orderBy('purchase_date', 'desc')->orderBy('id', 'desc')
            ->limit(500)
            ->get();

        return response()->json(['success' => true, 'data' => $purchases->map(fn (Purchase $p) => $p->toApiArray())->values()]);
    }

    public function pay(Request $request, int $id, PayableService $payables): JsonResponse
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
            'account_code' => ['required', Rule::in(['1-1000', '1-1001'])],
            'payment_date' => 'nullable|date|before_or_equal:today',
            'notes' => 'nullable|string|max:255',
        ], ['payment_date.before_or_equal' => 'Tanggal pembayaran tidak boleh melebihi hari ini.']);

        $out = $payables->pay($id, $data, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Pelunasan hutang {$out['purchase']->purchase_number} tercatat.",
            'data' => ['purchase' => $out['purchase']->toApiArray(), 'journal' => $out['journal']->toApiArray()],
        ], 201);
    }

    public function returnGoods(Request $request, int $id, PurchaseReturnService $returns): JsonResponse
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|min:5|max:255',
            'refund_account_code' => ['nullable', Rule::in(['1-1000', '1-1001'])],
        ]);
        $out = $returns->returnGoods($id, (int) $data['quantity'], $data['reason'], $data['refund_account_code'] ?? null, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Retur pembelian {$out['return']->reference} dibukukan.",
            'data' => [
                'purchase' => $out['purchase']->toApiArray(),
                'purchase_return' => $out['return']->toApiArray(),
                'journal' => $out['journal']?->toApiArray(),
            ],
        ], 201);
    }

    public function cancel(Request $request, int $id, PurchaseReturnService $returns): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:5|max:255']);
        $out = $returns->cancel($id, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Penerimaan {$out['purchase']->purchase_number} dibatalkan.",
            'data' => [
                'purchase' => $out['purchase']->toApiArray(),
                'purchase_return' => $out['return']->toApiArray(),
                'journal' => $out['journal']?->toApiArray(),
            ],
        ]);
    }
}
