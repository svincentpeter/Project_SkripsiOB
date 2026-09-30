<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Services\Accounting\CashSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashSessionController extends Controller
{
    public function __construct(private readonly CashSessionService $sessions)
    {
    }

    /** Shift terbuka (dengan rincian kas seharusnya) dan saldo buku laci sebagai usulan kas awal. */
    public function current(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'session' => CashSessionService::current()?->toApiArray(),
                'book_balance' => CashSessionService::bookBalance(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => 'nullable|in:OPEN,PENDING_APPROVAL,CLOSED']);

        // ponytail: 30 shift terbaru tanpa paging; tambah paging bila riwayat shift perlu ditelusuri.
        $rows = CashSession::with(['user', 'closer', 'approver', 'journalEntry'])
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->orderByRaw("CASE status WHEN 'PENDING_APPROVAL' THEN 0 WHEN 'OPEN' THEN 1 ELSE 2 END")
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (CashSession $s) => $s->toApiArray())->values()]);
    }

    public function open(Request $request): JsonResponse
    {
        $data = $request->validate([
            'opening_float' => 'required|numeric|min:0|max:999999999999',
            'opening_note' => 'nullable|string|max:255',
        ]);

        $session = $this->sessions->open($request->user(), (float) $data['opening_float'], $data['opening_note'] ?? null);

        return response()->json([
            'success' => true,
            'message' => "Shift kasir #{$session->id} dibuka.",
            'data' => $session->toApiArray(),
        ], 201);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'counted_cash' => 'required|numeric|min:0|max:999999999999',
            'variance_reason' => 'nullable|string|max:255',
        ]);

        $session = $this->sessions->close($id, $request->user(), (float) $data['counted_cash'], $data['variance_reason'] ?? null);

        return response()->json([
            'success' => true,
            'message' => "Shift #{$session->id} ditutup dan menunggu persetujuan pemilik.",
            'data' => $session->toApiArray(),
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $result = $this->sessions->approve($id, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Shift #{$result['session']->id} disetujui.",
            'data' => [
                'session' => $result['session']->toApiArray(),
                'journals' => $result['journal'] ? [$result['journal']->toApiArray()] : [],
            ],
        ]);
    }
}
