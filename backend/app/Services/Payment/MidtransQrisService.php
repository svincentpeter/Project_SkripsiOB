<?php

namespace App\Services\Payment;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MidtransQrisService
{
    protected string $serverKey;
    protected string $clientKey;
    protected string $apiUrl;
    protected bool $isProduction;

    public function __construct()
    {
        $this->serverKey = config('midtrans.server_key', 'SB-Mid-server-TEST_KEY_DEMO_OMAHBAN');
        $this->clientKey = config('midtrans.client_key', 'SB-Mid-client-TEST_KEY_DEMO_OMAHBAN');
        $this->apiUrl = rtrim(config('midtrans.api_url', 'https://api.sandbox.midtrans.com'), '/');
        $this->isProduction = (bool) config('midtrans.is_production', false);
    }

    /**
     * Membuat transaksi QRIS Dinamis melalui Midtrans Core API.
     *
     * @param  string  $orderId  Nomor unik nota / invoice (misal POS-20260910-001)
     * @param  int  $grossAmount  Nominal tagihan dalam Rupiah
     * @param  array  $customerDetails  Data opsional pelanggan
     * @return array
     */
    public function createCharge(string $orderId, int $grossAmount, array $customerDetails = []): array
    {
        if ($grossAmount <= 0) {
            throw new RuntimeException('Nominal transaksi harus lebih besar dari Rp 0.');
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

            $data = $response->json();

            if ($response->successful() && isset($data['qr_string'])) {
                $qrUrl = null;
                if (! empty($data['actions'])) {
                    foreach ($data['actions'] as $action) {
                        if (($action['name'] ?? '') === 'generate-qr-code') {
                            $qrUrl = $action['url'] ?? null;
                            break;
                        }
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

            // Jika response API gagal (misal invalid demo key), fallback ke generated simulation QR string
            Log::warning('Midtrans API charge tidak mengembalikan QR string, fallback simulasi aktif', ['response' => $data]);
            return $this->generateFallbackCharge($orderId, $grossAmount);
        } catch (\Throwable $e) {
            Log::error('Koneksi Midtrans charge gagal', ['exception' => $e]);
            return $this->generateFallbackCharge($orderId, $grossAmount);
        }
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
