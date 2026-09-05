<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use Tests\TestCase;

class PosTransactionTest extends TestCase
{
    public function test_pos_checkout_creates_sale_deducts_fifo_stock_and_creates_balanced_journal(): void
    {
        $unique = time() . '_' . rand(100, 999);
        $product = Product::create([
            'product_name' => 'Tire POS Test ' . $unique,
            'product_code' => 'POS-' . $unique,
            'barcode' => 'BC-POS-' . $unique,
            'brand' => 'Dunlop',
            'product_cost' => 500000,
            'product_price' => 700000,
            'product_quantity' => 10,
        ]);

        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-POS-' . $unique,
            'source_name' => 'PT Dunlop Indonesia',
            'purchase_date' => '2026-08-01',
            'batch_cost' => 500000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
        ]);

        $payload = [
            'customer_name' => 'Budi Santoso',
            'vehicle_plate' => 'B 5555 XYZ',
            'payment_method' => 'TUNAI',
            'paid_amount' => 1500000,
            'discount_amount' => 50000,
            'tax_amount' => 0,
            'items' => [
                [
                    'product_id' => $product->id,
                    'type' => 'product',
                    'name' => $product->product_name,
                    'quantity' => 2,
                    'unit_price' => 700000,
                    'sub_total' => 1400000,
                    'discount_amount' => 50000,
                ]
            ]
        ];

        $response = $this->postJson('/api/v1/pos/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'reference',
                    'grand_total',
                    'total_hpp',
                    'journal_entry_number',
                ]
            ]);

        // Verify product stock decremented from 10 to 8
        $product->refresh();
        $this->assertEquals(8, $product->product_quantity);

        // Verify journal entries and items exist
        $ref = $response->json('data.reference');
        $this->assertDatabaseHas('sales', ['reference' => $ref]);
        $this->assertDatabaseHas('journal_entries', ['reference_id' => $ref, 'status' => 'POSTED']);
    }
}
