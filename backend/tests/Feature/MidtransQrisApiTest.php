<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MidtransQrisApiTest extends TestCase
{
    public function test_can_charge_qris_and_receive_qr_string(): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '201',
                'status_message' => 'Success, QRIS transaction is created',
                'transaction_id' => 'mid-txn-123456',
                'order_id' => 'POS-20260910-001',
                'gross_amount' => '350000.00',
                'payment_type' => 'qris',
                'transaction_time' => '2026-09-10 16:00:00',
                'transaction_status' => 'pending',
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'actions' => [
                    [
                        'name' => 'generate-qr-code',
                        'method' => 'GET',
                        'url' => 'https://api.sandbox.midtrans.com/v2/qris/mid-txn-123456/qr-code',
                    ]
                ],
            ], 201),
        ]);

        $response = $this->postJson('/api/v1/payment/qris/charge', [
            'order_id' => 'POS-20260910-001',
            'gross_amount' => 350000,
            'customer_name' => 'Budi Santoso',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'order_id' => 'POS-20260910-001',
                'gross_amount' => 350000,
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'transaction_status' => 'pending',
            ],
        ]);
    }

    public function test_can_check_qris_status(): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/POS-20260910-001/status' => Http::response([
                'status_code' => '200',
                'status_message' => 'Success, transaction found',
                'transaction_id' => 'mid-txn-123456',
                'order_id' => 'POS-20260910-001',
                'gross_amount' => '350000.00',
                'payment_type' => 'qris',
                'transaction_status' => 'settlement',
                'settlement_time' => '2026-09-10 16:02:00',
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/payment/qris/status/POS-20260910-001');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'order_id' => 'POS-20260910-001',
                'transaction_status' => 'settlement',
            ],
        ]);
    }

    public function test_can_simulate_qris_payment_in_sandbox(): void
    {
        $response = $this->postJson('/api/v1/payment/qris/simulate/POS-20260910-999');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'order_id' => 'POS-20260910-999',
                'transaction_status' => 'settlement',
            ],
        ]);
    }
}
