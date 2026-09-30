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

    public function test_charge_returns_qr_string_and_records_a_pending_order(): void
    {
        $orderId = 'POS-CHG-'.uniqid();
        $this->fakeCharge($orderId, 350000);

        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => $orderId, 'gross_amount' => 350000, 'customer_name' => 'Budi Santoso'])
            ->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => $orderId,
                    'gross_amount' => 350000,
                    'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                    'transaction_status' => 'pending',
                    'simulation_enabled' => false,
                ],
            ]);

        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $orderId, 'gross_amount' => 350000, 'transaction_status' => 'pending', 'sale_payment_id' => null,
        ]);
    }

    public function test_charge_without_server_key_fails_unless_simulation_is_enabled(): void
    {
        config(['midtrans.server_key' => '']);
        Http::fake();
        $body = ['order_id' => 'POS-NOKEY-'.uniqid(), 'gross_amount' => 100000];

        $this->postJson('/api/v1/payment/qris/charge', $body)->assertStatus(422)->assertJsonPath('success', false);
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $body['order_id']]);

        config(['midtrans.allow_simulation' => true]);
        $this->postJson('/api/v1/payment/qris/charge', $body)->assertOk()
            ->assertJsonPath('data.is_fallback', true)
            ->assertJsonPath('data.simulation_enabled', true);

        Http::assertNothingSent();
    }

    public function test_midtrans_error_is_not_hidden_behind_a_fake_qr(): void
    {
        $orderId = 'POS-ERR-'.uniqid();
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response(['status_code' => '401', 'status_message' => 'Unknown Merchant server_key/id'], 401),
        ]);

        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => $orderId, 'gross_amount' => 100000])
            ->assertStatus(422)
            ->assertJsonMissingPath('data.qr_string');
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $orderId]);
    }

    public function test_status_check_records_the_settlement_reported_by_midtrans_once(): void
    {
        $orderId = 'POS-ST-'.uniqid();
        Http::fake([
            "https://api.sandbox.midtrans.com/v2/{$orderId}/status" => Http::response([
                'status_code' => '200',
                'order_id' => $orderId,
                'gross_amount' => '350000.00',
                'payment_type' => 'qris',
                'transaction_status' => 'settlement',
                'settlement_time' => '2026-09-10 16:02:00',
            ], 200),
        ]);

        $this->getJson("/api/v1/payment/qris/status/{$orderId}")
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => $orderId, 'transaction_status' => 'settlement', 'gross_amount' => 350000, 'is_simulated' => false]]);
        $this->getJson("/api/v1/payment/qris/status/{$orderId}")->assertJsonPath('data.transaction_status', 'settlement');

        Http::assertSentCount(1);
        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $orderId, 'gross_amount' => 350000, 'transaction_status' => 'settlement', 'settlement_source' => 'STATUS_API',
        ]);
    }

    public function test_simulation_is_forbidden_unless_enabled(): void
    {
        $this->postJson('/api/v1/payment/qris/simulate/POS-20260910-999')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_simulation_settles_a_charged_order_at_its_charged_amount(): void
    {
        config(['midtrans.allow_simulation' => true]);
        $orderId = 'POS-SIM-'.uniqid();
        $this->fakeCharge($orderId, 275000);
        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => $orderId, 'gross_amount' => 275000])->assertOk();

        $this->postJson("/api/v1/payment/qris/simulate/{$orderId}")
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => $orderId, 'transaction_status' => 'settlement', 'gross_amount' => 275000, 'is_simulated' => true]]);

        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $orderId, 'gross_amount' => 275000, 'transaction_status' => 'settlement', 'settlement_source' => 'SIMULATION',
        ]);
    }

    public function test_simulation_of_an_order_that_was_never_charged_is_rejected(): void
    {
        config(['midtrans.allow_simulation' => true]);

        $this->postJson('/api/v1/payment/qris/simulate/POS-UNKNOWN-'.uniqid())->assertStatus(422);
    }

    public function test_webhook_records_the_signed_settled_amount(): void
    {
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement']);

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertOk();
        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertOk(); // Midtrans mengirim ulang: tetap satu baris

        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $payload['order_id'], 'gross_amount' => 150000, 'transaction_status' => 'settlement', 'settlement_source' => 'WEBHOOK',
        ]);

        Http::fake();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")
            ->assertJsonPath('data.transaction_status', 'settlement')
            ->assertJsonPath('data.gross_amount', 150000);
        Http::assertNothingSent();
    }

    public function test_webhook_with_forged_signature_is_rejected(): void
    {
        Http::fake();
        $payload = ['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement', 'signature_key' => str_repeat('a', 128)];

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
        $this->postJson('/api/v1/payment/midtrans/webhook', ['order_id' => $payload['order_id'], 'transaction_status' => 'settlement'])->assertForbidden();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")->assertJsonPath('data.transaction_status', 'pending');
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $payload['order_id']]);
    }

    public function test_webhook_replay_with_an_edited_transaction_status_does_not_settle(): void
    {
        // transaction_status tidak ikut ditandatangani: notifikasi pending (201) sah yang statusnya diubah jadi settlement.
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '201', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement']);

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertOk();
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $payload['order_id'], 'transaction_status' => 'settlement']);
    }

    public function test_status_check_settles_only_the_order_midtrans_reports(): void
    {
        $orderId = 'POS-OTHER-'.uniqid();
        Http::fake(["https://api.sandbox.midtrans.com/v2/{$orderId}/status" => Http::response([
            'status_code' => '200', 'order_id' => 'POS-SOMETHING-ELSE', 'gross_amount' => '350000.00', 'transaction_status' => 'settlement',
        ], 200)]);

        $this->getJson("/api/v1/payment/qris/status/{$orderId}")->assertJsonPath('data.transaction_status', 'pending');
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $orderId]);
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => 'POS-SOMETHING-ELSE']);
    }

    public function test_status_check_url_encodes_the_order_id(): void
    {
        $orderId = 'POS-Q?x=1#y';
        Http::fake(fn () => Http::response(['status_code' => '404', 'transaction_status' => 'pending'], 404));

        $this->getJson('/api/v1/payment/qris/status/'.rawurlencode($orderId))->assertJsonPath('data.transaction_status', 'pending');

        Http::assertSent(fn ($request) => $request->url() === 'https://api.sandbox.midtrans.com/v2/POS-Q%3Fx%3D1%23y/status');
    }

    public function test_webhook_is_rejected_when_no_server_key_is_configured(): void
    {
        config(['midtrans.server_key' => '']);
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement'], '');

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $payload['order_id']]);
    }
}
