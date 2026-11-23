<?php

namespace Tests\Feature;

use App\Models\PaymentProviderSetting;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use Tests\TestCase;

class PaymentMethodSettingsParityTest extends TestCase
{
    public function test_pos_payment_options_endpoint_returns_active_settings(): void
    {
        $response = $this->getJson('/api/v1/pos/payment-options');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'bank_providers',
                    'qris_providers',
                ],
            ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data['bank_providers']);
        $this->assertNotEmpty($data['qris_providers']);
    }

    public function test_payment_providers_crud_endpoints(): void
    {
        // Store
        $postRes = $this->postJson('/api/v1/settings/payment-providers', [
            'method_type' => 'bank',
            'provider_name' => 'BSI Syariah',
            'provider_code' => 'BSI',
            'fee_percentage' => 0.00,
            'is_active' => true,
        ]);
        $postRes->assertStatus(201);
        $providerId = $postRes->json('data.id');

        // Update
        $putRes = $this->putJson("/api/v1/settings/payment-providers/{$providerId}", [
            'provider_name' => 'Bank Syariah Indonesia (BSI)',
            'fee_percentage' => 0.00,
        ]);
        $putRes->assertStatus(200)
            ->assertJsonPath('data.provider_name', 'Bank Syariah Indonesia (BSI)');

        // Delete
        $delRes = $this->deleteJson("/api/v1/settings/payment-providers/{$providerId}");
        $delRes->assertStatus(200);

        $this->assertNull(PaymentProviderSetting::find($providerId));
    }

    public function test_provider_fees_reject_null_and_implausible_percentages(): void
    {
        $id = $this->postJson('/api/v1/settings/payment-providers', ['method_type' => 'qris', 'provider_name' => uniqid('Uji MDR '), 'fee_percentage' => 0.3])
            ->assertCreated()->json('data.id');

        // null dulu menghasilkan galat SQL 500 (kolom NOT NULL); 30 hampir pasti salah ketik untuk 0,3.
        $this->putJson("/api/v1/settings/payment-providers/{$id}", ['fee_percentage' => null])->assertStatus(422);
        $this->putJson("/api/v1/settings/payment-providers/{$id}", ['fee_threshold_amount' => null])->assertStatus(422);
        $this->putJson("/api/v1/settings/payment-providers/{$id}", ['fee_percentage' => 30])->assertStatus(422);
        $this->putJson("/api/v1/settings/payment-providers/{$id}", ['fee_percentage' => 0.7])->assertOk()->assertJsonPath('data.fee_percentage', '0.70');
        PaymentProviderSetting::destroy($id); // kelas ini tanpa DatabaseTransactions
    }
}
