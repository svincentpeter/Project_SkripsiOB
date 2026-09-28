<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Accounting\PeriodClosingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountingPeriodController extends Controller
{
    public function __construct(private readonly PeriodClosingService $periods)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->periods->summary()]);
    }

    public function close(Request $request): JsonResponse
    {
        $data = $request->validate([
            'period' => 'required|date_format:Y-m',
            'notes' => 'nullable|string|max:255',
        ]);

        $closing = $this->periods->close($data['period'], $data['notes'] ?? null, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Periode {$data['period']} ditutup dan dikunci.",
            'data' => $closing->toApiArray(),
        ], 201);
    }

    public function reopen(Request $request, string $period): JsonResponse
    {
        abort_unless($request->user()->role === 'OWNER', 403, 'Hanya pemilik yang dapat membuka kembali periode yang sudah ditutup.');
        $data = $request->validate(['reason' => 'required|string|max:255']);

        $closing = $this->periods->reopen($period, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Periode {$period} dibuka kembali.",
            'data' => $closing->toApiArray(),
        ]);
    }
}
