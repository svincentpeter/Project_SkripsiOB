<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Services\Inventory\PayableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PurchaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $purchases = Purchase::query()
            ->when($request->input('status', 'all') === 'open', fn ($q) => $q->where('payment_method', 'TEMPO')->where('status', '!=', 'LUNAS'))
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
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);

        $out = $payables->pay($id, $data, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Pelunasan hutang {$out['purchase']->purchase_number} tercatat.",
            'data' => ['purchase' => $out['purchase']->toApiArray(), 'journal' => $out['journal']->toApiArray()],
        ], 201);
    }
}
