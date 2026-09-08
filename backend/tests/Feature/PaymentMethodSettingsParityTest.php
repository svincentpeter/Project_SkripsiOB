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

    public function test_pos_checkout_with_qris_fee_absorbed_by_store(): void
    {
        $unique = time() . '_' . rand(100, 999);
        $product = Product::create([
            'product_name' => 'Tire QRIS Test ' . $unique,
            'product_code' => 'POS-QRIS-' . $unique,
            'barcode' => 'BC-QRIS-' . $unique,
            'brand' => 'Bridgestone',
            'product_cost' => 600000,
            'product_price' => 1000000,
            'product_quantity' => 10,
        ]);

        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-QRIS-' . $unique,
            'source_name' => 'PT Bridgestone',
            'purchase_date' => '2026-08-01',
            'batch_cost' => 600000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
        ]);

        // Base 1.000.000, MDR 0.3% = 3.000 fee. Net received = 997.000.
        $payload = [
            'customer_name' => 'Hendra QRIS',
            'vehicle_plate' => 'AB 1234 CD',
            'payment_method' => 'QRIS',
            'payment_provider' => 'BCA',
            'fee_percentage' => 0.30,
            'fee_amount' => 3000,
            'surcharge_amount' => 0,
            'net_received' => 997000,
            'paid_amount' => 1000000,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'items' => [
                [
                    'product_id' => $product->id,
                    'type' => 'product',
                    'name' => $product->product_name,
                    'quantity' => 1,
                    'unit_price' => 1000000,
                    'sub_total' => 1000000,
                    'discount_amount' => 0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/pos/checkout', $payload);

        $response->assertStatus(201);
        $saleId = $response->json('data.id');
        $sale = Sale::with('journalEntry.items.account')->findOrFail($saleId);

        $this->assertEquals(1000000, (float) $sale->total_amount);
        $this->assertEquals(3000, (float) $sale->fee_amount);
        $this->assertEquals(997000, (float) $sale->net_received);
        $this->assertEquals('BCA', $sale->payment_provider);

        // Verify Journal balanced
        $journal = $sale->journalEntry;
        $this->assertNotNull($journal);
        $totalDebit = $journal->items->sum('debit');
        $totalCredit = $journal->items->sum('credit');
        $this->assertEquals($totalDebit, $totalCredit);

        // Verify MDR expense line exists (Account 6-1009)
        $mdrItem = $journal->items->firstWhere('account.account_code', '6-1009');
        $this->assertNotNull($mdrItem);
        $this->assertEquals(3000, (float) $mdrItem->debit);
    }

    public function test_pos_checkout_with_edc_credit_surcharge_charged_to_customer(): void
    {
        $unique = time() . '_' . rand(100, 999);
        $product = Product::create([
            'product_name' => 'Tire EDC Test ' . $unique,
            'product_code' => 'POS-EDC-' . $unique,
            'barcode' => 'BC-EDC-' . $unique,
            'brand' => 'Michelin',
            'product_cost' => 800000,
            'product_price' => 1000000,
            'product_quantity' => 10,
        ]);

        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-EDC-' . $unique,
            'source_name' => 'PT Michelin',
            'purchase_date' => '2026-08-01',
            'batch_cost' => 800000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
        ]);

        // Base 1.000.000, Surcharge 2.0% = 20.000. Customer pays swiped 1.020.000.
        $payload = [
            'customer_name' => 'Rian EDC Credit',
            'vehicle_plate' => 'B 9999 EDC',
            'payment_method' => 'EDC_CREDIT',
            'edc_bank' => 'BCA',
            'edc_type' => 'Credit',
            'fee_percentage' => 2.00,
            'fee_amount' => 20000,
            'surcharge_amount' => 20000,
            'net_received' => 1000000,
            'paid_amount' => 1020000,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'items' => [
                [
                    'product_id' => $product->id,
                    'type' => 'product',
                    'name' => $product->product_name,
                    'quantity' => 1,
                    'unit_price' => 1000000,
                    'sub_total' => 1000000,
                    'discount_amount' => 0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/pos/checkout', $payload);

        $response->assertStatus(201);
        $saleId = $response->json('data.id');
        $sale = Sale::with('journalEntry.items.account')->findOrFail($saleId);

        // Total amount and paid amount must include surcharge
        $this->assertEquals(1020000, (float) $sale->total_amount);
        $this->assertEquals(1020000, (float) $sale->paid_amount);
        $this->assertEquals(20000, (float) $sale->surcharge_amount);
        $this->assertEquals('BCA', $sale->edc_bank);
        $this->assertEquals('Credit', $sale->edc_type);

        // Verify Journal balanced
        $journal = $sale->journalEntry;
        $this->assertNotNull($journal);
        $totalDebit = $journal->items->sum('debit');
        $totalCredit = $journal->items->sum('credit');
        $this->assertEquals($totalDebit, $totalCredit);

        // Verify Surcharge Revenue line exists (Account 4-2000)
        $surchargeItem = $journal->items->firstWhere('account.account_code', '4-2000');
        $this->assertNotNull($surchargeItem);
        $this->assertEquals(20000, (float) $surchargeItem->credit);
    }
}
