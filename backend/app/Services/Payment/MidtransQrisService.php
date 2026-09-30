<?php

namespace App\Services\Payment;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MidtransQrisService
{
    protected string $serverKey;
    protected string $apiUrl;

    public function __construct()
    {
        // Tanpa kunci bawaan: kunci demo yang tertulis di repo membuat signature webhook bisa dipalsukan.
        $this->serverKey = (string) config('midtrans.server_key');
        $this->apiUrl = rtrim((string) config('midtrans.api_url'), '/');
    }

    /**
     * Membuat transaksi QRIS Dinamis melalui Midtrans Core API.
     *
     * @param  string  $orderId  Nomor unik order QRIS (misal POS-1727650000000)
     * @param  int  $grossAmount  Nominal tagihan dalam Rupiah
     * @param  array  $customerDetails  Data opsional pelanggan
     */
    public function createCharge(string $orderId, int $grossAmount, array $customerDetails = []): array
    {
        if ($grossAmount <= 0) {
            throw new RuntimeException('Nominal transaksi harus lebih besar dari Rp 0.');
        }
        if ($this->serverKey === '') {
            return $this->fallbackOrFail($orderId, $grossAmount, 'MIDTRANS_SERVER_KEY belum diatur.');
        }

        $payload = [
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $grossAmount,
            ],
            'qris' => [
                'acquirer' => 'gopay',
            ],
            'customer_details' => [
                'first_name' => $customerDetails['customer_name'] ?? 'Pelanggan Omah Ban',
            ],
        ];

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->apiUrl}/v2/charge", $payload);
        } catch (\Throwable $e) {
            Log::error('Koneksi Midtrans charge gagal', ['exception' => $e]);

            return $this->fallbackOrFail($orderId, $grossAmount, 'koneksi ke Midtrans gagal.');
        }

        $data = $response->json();

        if ($response->successful() && isset($data['qr_string'])) {
            $qrUrl = null;
            foreach ($data['actions'] ?? [] as $action) {
                if (($action['name'] ?? '') === 'generate-qr-code') {
                    $qrUrl = $action['url'] ?? null;
                    break;
                }
            }

            return [
                'order_id' => $data['order_id'] ?? $orderId,
                'gross_amount' => (int) ($data['gross_amount'] ?? $grossAmount),
                'transaction_id' => $data['transaction_id'] ?? null,
                'transaction_status' => $data['transaction_status'] ?? 'pending',
                'qr_string' => $data['qr_string'],
                'qr_url' => $qrUrl,
                'expiry_time' => $data['expiry_time'] ?? now()->addMinutes(15)->toIso8601String(),
            ];
        }

        Log::warning('Midtrans API charge tidak mengembalikan QR string', ['response' => $data]);

        return $this->fallbackOrFail($orderId, $grossAmount, $data['status_message'] ?? 'respons Midtrans tidak berisi kode QR.');
    }

    /**
     * Memeriksa status pelunasan transaksi dari Midtrans Core API atau status simulasi sandbox.
     *
     * @param  string  $orderId
     * @return array
     */
    public function checkStatus(string $orderId): array
    {
        // 1. Prioritaskan status simulasi lokal jika ada
        $simulatedStatus = Cache::get("midtrans_sim_{$orderId}");
        if ($simulatedStatus) {
            return [
                'order_id' => $orderId,
                'transaction_status' => $simulatedStatus,
                'payment_type' => 'qris',
                'settlement_time' => now()->toIso8601String(),
                'is_simulated' => true,
            ];
        }

        if ($this->serverKey === '') {
            return ['order_id' => $orderId, 'transaction_status' => 'pending', 'payment_type' => 'qris', 'is_simulated' => false];
        }

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders([
                    'Accept' => 'application/json',
                ])
                ->get("{$this->apiUrl}/v2/{$orderId}/status");

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'order_id' => $data['order_id'] ?? $orderId,
                    'transaction_status' => $data['transaction_status'] ?? 'pending',
                    'payment_type' => $data['payment_type'] ?? 'qris',
                    'gross_amount' => (int) ($data['gross_amount'] ?? 0),
                    'settlement_time' => $data['settlement_time'] ?? null,
                    'is_simulated' => false,
                ];
            }

            return [
                'order_id' => $orderId,
                'transaction_status' => 'pending',
                'payment_type' => 'qris',
                'is_simulated' => false,
            ];
        } catch (\Throwable $e) {
            Log::error('Gagal periksa status Midtrans', ['order_id' => $orderId, 'exception' => $e]);
            return [
                'order_id' => $orderId,
                'transaction_status' => 'pending',
                'payment_type' => 'qris',
                'is_simulated' => false,
            ];
        }
    }

    /**
     * Memicu pelunasan instan untuk pengujian Sandbox atau Demo Sidang Skripsi.
     *
     * @param  string  $orderId
     * @return array
     */
    public function simulateSettlement(string $orderId): array
    {
        Cache::put("midtrans_sim_{$orderId}", 'settlement', now()->addHours(2));

        return [
            'order_id' => $orderId,
            'transaction_status' => 'settlement',
            'payment_type' => 'qris',
            'settlement_time' => now()->toIso8601String(),
            'message' => 'Status pembayaran berhasil disimulasikan LUNAS (Settlement).',
        ];
    }

    /**
     * QR cadangan hanya boleh di mode demo sandbox; di luar itu kasir harus tahu QRIS gagal dibuat
     * (QR palsu tidak bisa dibayar pelanggan).
     */
    protected function fallbackOrFail(string $orderId, int $grossAmount, string $reason): array
    {
        if (! config('midtrans.allow_simulation')) {
            throw new RuntimeException($reason);
        }

        return $this->generateFallbackCharge($orderId, $grossAmount);
    }

    /**
     * Generate fallback valid EMVCo QRIS string untuk mode offline / mock developer.
     */
    protected function generateFallbackCharge(string $orderId, int $grossAmount): array
    {
        $mockQr = "00020101021226590014ID.LINKAJA.WWW0118936009110022094894520458125303360540"
            . str_pad((string) $grossAmount, 6, '0', STR_PAD_LEFT)
            . "5802ID5914OMAH BAN CAB 36007BANDUNG62170113{$orderId}6304ABCD";

        return [
            'order_id' => $orderId,
            'gross_amount' => $grossAmount,
            'transaction_id' => 'sim-mid-' . uniqid(),
            'transaction_status' => 'pending',
            'qr_string' => $mockQr,
            'qr_url' => "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" . urlencode($mockQr),
            'expiry_time' => now()->addMinutes(15)->toIso8601String(),
            'is_fallback' => true,
        ];
    }
}
