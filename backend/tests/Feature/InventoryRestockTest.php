<?php

namespace Tests\Feature;

use App\Models\Product;
use Tests\TestCase;

class InventoryRestockTest extends TestCase
{
    public function test_inventory_restock_adds_batch_and_purchase_journal(): void
    {
        $unique = time() . '_' . rand(100, 999);
        $product = Product::create([
            'product_name' => 'Tire Restock Test ' . $unique,
            'product_code' => 'RESTOCK-' . $unique,
            'barcode' => 'BC-RESTOCK-' . $unique,
            'brand' => 'Hankook',
            'product_cost' => 450000,
            'product_price' => 600000,
            'product_quantity' => 0,
        ]);

        $payload = [
            'product_id' => $product->id,
            'quantity' => 20,
            'batch_cost' => 450000,
            'source_name' => 'PT Hankook Tire Indonesia',
            'purchase_date' => '2026-09-01',
            'payment_method' => 'TEMPO',
        ];

        $response = $this->postJson('/api/v1/inventory/restock', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'batch',
                    'journal_entry_number',
                ]
            ]);

        $product->refresh();
        $this->assertEquals(20, $product->product_quantity);
    }
}
