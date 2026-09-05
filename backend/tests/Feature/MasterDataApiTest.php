<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ServiceMaster;
use App\Models\Supplier;
use Tests\TestCase;

class MasterDataApiTest extends TestCase
{
    public function test_can_list_products(): void
    {
        $response = $this->getJson('/api/v1/products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'product_name', 'product_code', 'barcode', 'brand', 'product_price', 'product_quantity']
                ]
            ]);
    }

    public function test_can_create_product_with_initial_stock(): void
    {
        $uniqueCode = 'TEST-' . time();
        $payload = [
            'product_name' => 'Tire Test Unit ' . time(),
            'product_code' => $uniqueCode,
            'barcode' => 'BC-' . $uniqueCode,
            'brand' => 'Accelera',
            'category' => 'BAN_BARU',
            'product_size' => '185/65 R15',
            'product_cost' => 600000,
            'product_price' => 750000,
            'product_quantity' => 10,
            'initial_batch' => [
                'source_name' => 'PT Test Supplier',
                'batch_cost' => 600000,
                'initial_qty' => 10,
            ]
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'product_code' => $uniqueCode,
                    'product_quantity' => 10,
                ]
            ]);

        $this->assertDatabaseHas('products', ['product_code' => $uniqueCode]);
        $this->assertDatabaseHas('product_batches', ['batch_cost' => 600000, 'initial_qty' => 10]);
    }

    public function test_can_list_services(): void
    {
        $response = $this->getJson('/api/v1/services');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_can_list_suppliers(): void
    {
        $response = $this->getJson('/api/v1/suppliers');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_can_list_accounts(): void
    {
        $response = $this->getJson('/api/v1/accounts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'account_code', 'account_name', 'account_type', 'normal_balance']
                ]
            ]);
    }
}
