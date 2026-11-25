<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\QrisTransaction;
use App\Services\Payment\MidtransQrisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentApiController extends Controller
{
    public function __construct(private readonly MidtransQrisService $qrisService)
    {
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
        } catch (\Throwable $e) {
            Log::error('Gagal membuat QRIS charge', ['exception' => $e]);
            // Hanya pesan yang ditulis untuk kasir (penolakan Midtrans, aturan bisnis); galat lain (SQL, jaringan) disamarkan.
            $known = $e instanceof \App\Exceptions\PosRuleException
                || ($e instanceof \RuntimeException && ! $e instanceof \Illuminate\Database\QueryException);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat QRIS: '.($known ? $e->getMessage() : 'terjadi kesalahan pada server, coba lagi.'),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'QRIS Dinamis berhasil dibuat.',
            // Kasir hanya menampilkan tombol simulasi bila server mengizinkannya.
            'data' => $data + [
                'simulation_enabled' => (bool) config('midtrans.allow_simulation'),
                'is_production' => (bool) config('midtrans.is_production'),
            ],
        ]);
    }

    /**
     * Membuat sesi Midtrans Snap (pengganti EDC fisik: Kartu Kredit/Debit, VA, E-Wallet, QRIS).
     *
     * POST /api/v1/payment/midtrans/snap
     */
    public function createSnapTransaction(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|string|max:64',
            'gross_amount' => 'required|integer|min:1',
            'customer_name' => 'nullable|string|max:128',
        ]);

        try {
            $data = $this->qrisService->createSnapTransaction(
                $request->input('order_id'),
                (int) $request->input('gross_amount'),
                ['customer_name' => $request->input('customer_name')]
            );
        } catch (\Throwable $e) {
            Log::error('Gagal membuat sesi Midtrans Snap', ['exception' => $e]);
            $known = $e instanceof \App\Exceptions\PosRuleException
                || ($e instanceof \RuntimeException && ! $e instanceof \Illuminate\Database\QueryException);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuka Midtrans Snap: '.($known ? $e->getMessage() : 'terjadi kesalahan pada server, coba lagi.'),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sesi pembayaran Midtrans Snap berhasil dibuat.',
            'data' => $data + [
                'client_key' => (string) config('midtrans.client_key'),
                'snap_js_url' => (string) config('midtrans.snap_js_url'),
                'simulation_enabled' => (bool) config('midtrans.allow_simulation'),
                'is_production' => (bool) config('midtrans.is_production'),
            ],
        ]);
    }

    /**
     * Status pelunasan QRIS untuk polling kasir.
     *
     * GET /api/v1/payment/qris/status/{orderId}
     */
    public function checkQrisStatus(string $orderId): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->qrisService->checkStatus($orderId),
        ]);
    }

    /**
     * Demo sandbox: melunasi order yang sudah dibuat, sebesar nominal tagihannya.
     *
     * POST /api/v1/payment/qris/simulate/{orderId}
     */
    public function simulateQrisSettlement(string $orderId): JsonResponse
    {
        if (! config('midtrans.allow_simulation')) {
            return response()->json([
                'success' => false,
                'message' => 'Simulasi pembayaran QRIS hanya tersedia di mode demo sandbox.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Simulasi lunas berhasil diterapkan.',
            'data' => $this->qrisService->simulateSettlement($orderId)->toStatusArray(),
        ]);
    }

    /**
     * Notifikasi HTTP resmi Midtrans. Pelunasan dicatat dengan gross_amount yang ikut ditandatangani.
     *
     * POST /api/v1/payment/midtrans/webhook
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $orderId = $payload['order_id'] ?? null;
        $transactionStatus = $payload['transaction_status'] ?? null;

        // Sah hanya bila signature_key = sha512(order_id + status_code + gross_amount + signature_key/server_key).
        // Tanpa kunci, sha512 atas string publik bisa dihitung siapa saja: tolak semua notifikasi.
        $candidateKeys = array_values(array_unique(array_filter([
            (string) config('midtrans.signature_key'),
            (string) config('midtrans.server_key'),
        ], fn (string $k) => $k !== '')));

        $incomingSig = $payload['signature_key'] ?? null;
        $validSignature = false;
        if (is_string($incomingSig) && $candidateKeys !== []) {
            $base = ($payload['order_id'] ?? '').($payload['status_code'] ?? '').($payload['gross_amount'] ?? '');
            foreach ($candidateKeys as $secret) {
                if (hash_equals(hash('sha512', $base.$secret), $incomingSig)) {
                    $validSignature = true;
                    break;
                }
            }
        }
        if (! $validSignature) {
            Log::warning('Midtrans webhook ditolak: signature tidak valid', ['order_id' => $orderId]);

            return response()->json(['success' => false, 'message' => 'Signature notifikasi tidak valid.'], 403);
        }

        Log::info('Midtrans webhook diterima', ['order_id' => $orderId, 'status' => $transactionStatus]);

        // transaction_status tidak ikut ditandatangani: notifikasi sah lain (mis. pending 201) bisa diputar ulang dengan
        // status diubah. status_code ikut ditandatangani, jadi lunas hanya bila keduanya menyatakan berhasil (200).
        $signedSuccess = (string) ($payload['status_code'] ?? '') === '200';
        if ($signedSuccess && is_string($orderId) && $orderId !== '' && in_array($transactionStatus, ['settlement', 'capture'], true)) {
            $this->qrisService->markSettled($orderId, (float) ($payload['gross_amount'] ?? 0), QrisTransaction::SOURCE_WEBHOOK);
        }

        return response()->json([
            'success' => true,
            'message' => 'Webhook berhasil diproses.',
        ]);
    }
}
