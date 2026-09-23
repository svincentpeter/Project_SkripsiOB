<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Payment\MidtransQrisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentApiController extends Controller
{
    protected MidtransQrisService $qrisService;

    public function __construct(MidtransQrisService $qrisService)
    {
        $this->qrisService = $qrisService;
    }

    /**
     * Membuat charge transaksi QRIS Dinamis.
     *
     * POST /api/v1/payment/qris/charge
     */
    public function chargeQris(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|string|max:64',
            'gross_amount' => 'required|integer|min:1',
            'customer_name' => 'nullable|string|max:128',
        ]);

        try {
            $data = $this->qrisService->createCharge(
                $request->input('order_id'),
                (int) $request->input('gross_amount'),
                ['customer_name' => $request->input('customer_name')]
            );

            return response()->json([
                'success' => true,
                'message' => 'QRIS Dinamis berhasil dibuat.',
                'data' => $data,
            ]);
        } catch (\Throwable $e) {
            Log::error('Gagal membuat QRIS charge', ['exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat QRIS: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Memeriksa status transaksi QRIS secara berkala (Polling).
     *
     * GET /api/v1/payment/qris/status/{orderId}
     */
    public function checkQrisStatus(string $orderId): JsonResponse
    {
        try {
            $status = $this->qrisService->checkStatus($orderId);

            return response()->json([
                'success' => true,
                'data' => $status,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memeriksa status pembayaran: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Memicu status lunas seketika untuk kemudahan demo Sandbox / Sidang Skripsi.
     *
     * POST /api/v1/payment/qris/simulate/{orderId}
     */
    public function simulateQrisSettlement(string $orderId): JsonResponse
    {
        try {
            $result = $this->qrisService->simulateSettlement($orderId);

            return response()->json([
                'success' => true,
                'message' => 'Simulasi lunas berhasil diterapkan.',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses simulasi: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Menerima notifikasi webhook asynchronous resmi dari Midtrans HTTP Notification.
     *
     * POST /api/v1/payment/midtrans/webhook
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $orderId = $payload['order_id'] ?? null;
        $transactionStatus = $payload['transaction_status'] ?? null;

        // Notifikasi Midtrans sah hanya bila signature_key = sha512(order_id + status_code + gross_amount + server_key).
        $expected = hash('sha512', ($payload['order_id'] ?? '').($payload['status_code'] ?? '').($payload['gross_amount'] ?? '').config('midtrans.server_key'));
        if (! is_string($payload['signature_key'] ?? null) || ! hash_equals($expected, $payload['signature_key'])) {
            Log::warning('Midtrans webhook ditolak: signature tidak valid', ['order_id' => $orderId]);

            return response()->json(['success' => false, 'message' => 'Signature notifikasi tidak valid.'], 403);
        }

        Log::info('Midtrans webhook diterima', ['order_id' => $orderId, 'status' => $transactionStatus]);

        if ($orderId && in_array($transactionStatus, ['settlement', 'capture'])) {
            $this->qrisService->simulateSettlement($orderId);
        }

        return response()->json([
            'success' => true,
            'message' => 'Webhook berhasil diproses.',
        ]);
    }
}
