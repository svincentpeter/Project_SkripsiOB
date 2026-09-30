<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MidtransQrisApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // Kunci uji sendiri; simulasi mati kecuali tes menyalakannya (sama seperti default).
        config(['midtrans.server_key' => 'SB-Mid-server-phpunit', 'midtrans.allow_simulation' => false]);
    }

    private function fakeCharge(string $orderId, int $gross): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '201',
                'status_message' => 'Success, QRIS transaction is created',
                'transaction_id' => 'mid-txn-'.$orderId,
                'order_id' => $orderId,
                'gross_amount' => $gross.'.00',
                'payment_type' => 'qris',
                'transaction_status' => 'pending',
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'actions' => [
                    ['name' => 'generate-qr-code', 'method' => 'GET', 'url' => 'https://api.sandbox.midtrans.com/v2/qris/x/qr-code'],
                ],
            ], 201),
        ]);
    }

    private function signed(array $payload, ?string $key = null): array
    {
        $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].($key ?? config('midtrans.server_key')));

        return $payload;
    }

    public function test_can_charge_qris_and_receive_qr_string(): void
    {
        $this->fakeCharge('POS-20260910-001', 350000);

        $this->postJson('/api/v1/payment/qris/charge', [
            'order_id' => 'POS-20260910-001',
            'gross_amount' => 350000,
            'customer_name' => 'Budi Santoso',
        ])->assertOk()->assertJson([
            'success' => true,
            'data' => [
                'order_id' => 'POS-20260910-001',
                'gross_amount' => 350000,
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'transaction_status' => 'pending',
                'simulation_enabled' => false,
            ],
        ]);
    }

    public function test_charge_without_server_key_fails_unless_simulation_is_enabled(): void
    {
        config(['midtrans.server_key' => '']);
        Http::fake();
        $body = ['order_id' => 'POS-NOKEY-'.uniqid(), 'gross_amount' => 100000];

        $this->postJson('/api/v1/payment/qris/charge', $body)->assertStatus(422)->assertJsonPath('success', false);

        config(['midtrans.allow_simulation' => true]);
        $this->postJson('/api/v1/payment/qris/charge', $body)->assertOk()
            ->assertJsonPath('data.is_fallback', true)
            ->assertJsonPath('data.simulation_enabled', true);

        Http::assertNothingSent();
    }

    public function test_midtrans_error_is_not_hidden_behind_a_fake_qr(): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response(['status_code' => '401', 'status_message' => 'Unknown Merchant server_key/id'], 401),
        ]);

        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => 'POS-ERR-'.uniqid(), 'gross_amount' => 100000])
            ->assertStatus(422)
            ->assertJsonMissingPath('data.qr_string');
    }

    public function test_can_check_qris_status(): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/POS-20260910-001/status' => Http::response([
                'status_code' => '200',
                'order_id' => 'POS-20260910-001',
                'gross_amount' => '350000.00',
                'payment_type' => 'qris',
                'transaction_status' => 'settlement',
                'settlement_time' => '2026-09-10 16:02:00',
            ], 200),
        ]);

        $this->getJson('/api/v1/payment/qris/status/POS-20260910-001')
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => 'POS-20260910-001', 'transaction_status' => 'settlement']]);
    }

    public function test_simulation_is_forbidden_unless_enabled(): void
    {
        $this->postJson('/api/v1/payment/qris/simulate/POS-20260910-999')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_can_simulate_qris_payment_when_enabled(): void
    {
        config(['midtrans.allow_simulation' => true]);

        $this->postJson('/api/v1/payment/qris/simulate/POS-20260910-999')
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => 'POS-20260910-999', 'transaction_status' => 'settlement']]);
    }

    public function test_webhook_with_valid_signature_marks_order_settled(): void
    {
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement']);

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertOk();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")->assertJsonPath('data.transaction_status', 'settlement');
    }

    public function test_webhook_with_forged_signature_is_rejected(): void
    {
        Http::fake();
        $payload = ['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement', 'signature_key' => str_repeat('a', 128)];

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
        $this->postJson('/api/v1/payment/midtrans/webhook', ['order_id' => $payload['order_id'], 'transaction_status' => 'settlement'])->assertForbidden();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")->assertJsonPath('data.transaction_status', 'pending');
    }

    public function test_webhook_is_rejected_when_no_server_key_is_configured(): void
    {
        config(['midtrans.server_key' => '']);
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement'], '');

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
    }
}
