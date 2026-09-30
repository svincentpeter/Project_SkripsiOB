<?php

namespace App\Services\Payment;

use App\Exceptions\PosRuleException;
use App\Models\QrisTransaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * QRIS dinamis Midtrans. Setiap order yang dibuat dan setiap pelunasan (webhook bertanda tangan, cek status ke
 * Midtrans, simulasi demo) dicatat di qris_transactions beserta nominalnya; checkout hanya menerima order yang
 * lunas di tabel itu.
 */
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
     * Membuat QRIS Dinamis dan mencatat order-nya (pending, nominal tagihan).
     *
     * @param  string  $orderId  Nomor unik order QRIS (misal POS-1727650000000)
     * @param  int  $grossAmount  Nominal tagihan dalam Rupiah
     * @param  array  $customerDetails  Data opsional pelanggan
     */
    public function createCharge(string $orderId, int $grossAmount, array $customerDetails = []): array
    {
        $charge = $this->requestCharge($orderId, $grossAmount, $customerDetails);

        QrisTransaction::firstOrCreate(
            ['order_id' => $orderId],
            ['gross_amount' => $grossAmount, 'transaction_status' => 'pending']
        );

        return $charge;
    }

    /**
     * Status pelunasan: order yang sudah lunas dibaca dari tabel; selain itu ditanyakan ke Midtrans dan,
     * bila lunas, dicatat dengan nominal dari Midtrans.
     */
    public function checkStatus(string $orderId): array
    {
        $recorded = QrisTransaction::where('order_id', $orderId)->first();
        if ($recorded?->isSettled()) {
            return $recorded->toStatusArray();
        }

        $pending = ['order_id' => $orderId, 'transaction_status' => 'pending', 'payment_type' => 'qris', 'is_simulated' => false];
        if ($this->serverKey === '') {
            return $pending;
        }

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders(['Accept' => 'application/json'])
                ->get("{$this->apiUrl}/v2/".rawurlencode($orderId).'/status');
        } catch (\Throwable $e) {
            Log::error('Gagal periksa status Midtrans', ['order_id' => $orderId, 'exception' => $e]);

            return $pending;
        }

        if (! $response->successful()) {
            return $pending;
        }

        $data = $response->json();
        $status = $data['transaction_status'] ?? 'pending';
        // Catat di bawah order_id yang dilaporkan Midtrans, dan hanya bila itu memang order yang ditanyakan.
        $reportedId = $data['order_id'] ?? null;
        if (! is_string($reportedId) || strcasecmp($reportedId, $orderId) !== 0) {
            return $pending;
        }
        if (in_array($status, ['settlement', 'capture'], true)) {
            return $this->markSettled($reportedId, (float) ($data['gross_amount'] ?? 0), QrisTransaction::SOURCE_STATUS_API)->toStatusArray();
        }

        return ['order_id' => $orderId, 'transaction_status' => $status, 'payment_type' => 'qris', 'is_simulated' => false];
    }

    /**
     * Demo sandbox: melunasi order yang sudah dibuat lewat charge, sebesar nominal tagihannya.
     * Controller memastikan midtrans.allow_simulation aktif.
     */
    public function simulateSettlement(string $orderId): QrisTransaction
    {
        $charged = QrisTransaction::where('order_id', $orderId)->first();
        if (! $charged) {
            throw new PosRuleException("Order QRIS {$orderId} tidak ditemukan. Buat QRIS terlebih dahulu.");
        }

        return $this->markSettled($orderId, (float) $charged->gross_amount, QrisTransaction::SOURCE_SIMULATION);
    }

    /**
     * Catat pelunasan dari sumber tepercaya. Idempoten: pelunasan pertama yang menang (webhook yang dikirim
     * ulang atau polling bersamaan tidak mengubah nominal atau baris yang sudah dipakai nota).
     */
    public function markSettled(string $orderId, float $grossAmount, string $source): QrisTransaction
    {
        $tx = QrisTransaction::firstOrCreate(
            ['order_id' => $orderId],
            ['gross_amount' => $grossAmount, 'transaction_status' => 'pending']
        );

        if (! $tx->isSettled()) {
            $tx->update([
                'gross_amount' => $grossAmount,
                'transaction_status' => 'settlement',
                'settlement_source' => $source,
                'settled_at' => now(),
            ]);
        }

        return $tx;
    }

    protected function requestCharge(string $orderId, int $grossAmount, array $customerDetails): array
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
