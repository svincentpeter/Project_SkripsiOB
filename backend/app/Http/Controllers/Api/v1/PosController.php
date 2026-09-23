<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PosCheckoutRequest;
use App\Models\Sale;
use App\Services\Pos\CheckoutService;
use App\Services\Pos\SaleVoidService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Sale::with(['details.product', 'payments', 'receivablePayments'])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('reference', 'like', "%{$s}%")
                    ->orWhere('customer_name', 'like', "%{$s}%")
                    ->orWhere('vehicle_plate', 'like', "%{$s}%");
            });
        }

        if ($request->filled('date')) {
            $query->where('date', $request->date);
        }

        $sales = $query->limit(min((int) $request->input('limit', 200), 500))->get();

        return response()->json([
            'success' => true,
            'data' => $sales->map(fn (Sale $sale) => $sale->toReceiptArray())->values(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Sale::findOrFail($id)->toReceiptArray(),
        ]);
    }

    public function void(Request $request, int $id, SaleVoidService $voider): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:5|max:255']);
        $sale = $voider->void($id, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Nota {$sale->reference} dibatalkan.",
            'data' => $sale->toReceiptArray(),
        ]);
    }

    public function checkout(PosCheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        $sale = $checkout->checkout($request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Nota {$sale->reference} berhasil dibukukan.",
            'data' => $sale->toReceiptArray(),
        ], 201);
    }
}
