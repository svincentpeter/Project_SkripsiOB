<?php

namespace Tests\Feature;

use App\Models\EdcSetting;
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
                    'edc_settings',
                ],
            ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data['bank_providers']);
        $this->assertNotEmpty($data['qris_providers']);
        $this->assertNotEmpty($data['edc_settings']);
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

    public function test_edc_settings_crud_endpoints(): void
    {
        // Store
        $postRes = $this->postJson('/api/v1/settings/edc', [
            'bank_name' => 'CIMB Niaga',
            'payment_type' => 'Credit',
            'fee_percentage' => 2.20,
            'is_active' => true,
        ]);
        $postRes->assertStatus(201);
        $edcId = $postRes->json('data.id');

        // Update
        $putRes = $this->putJson("/api/v1/settings/edc/{$edcId}", [
            'fee_percentage' => 2.50,
            'is_active' => false,
        ]);
        $putRes->assertStatus(200)
            ->assertJsonPath('data.fee_percentage', '2.50');

        // Delete
        $delRes = $this->deleteJson("/api/v1/settings/edc/{$edcId}");
        $delRes->assertStatus(200);

        $this->assertNull(EdcSetting::find($edcId));
    }
}
