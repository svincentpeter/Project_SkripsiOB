<?php

namespace Tests\Feature;

use App\Models\ServiceMaster;
use App\Services\Payment\MidtransQrisService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class PosCheckoutTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    public function test_cash_checkout_computes_change_fifo_cogs_and_balanced_journal(): void
    {
        // Dua batch: FIFO mengambil 1 unit @500rb lalu 1 unit @600rb.
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);

        $res = $this->checkout([
            'items' => [$this->productLine($product, 2, null, 50000)],
            'discount_amount' => 100000,
            'payments' => [['method' => 'TUNAI', 'amount' => 1800000, 'tendered' => 2000000]],
        ])->assertCreated();

        $res->assertJsonPath('data.total_amount', 1800000)
            ->assertJsonPath('data.change_amount', 200000)
            ->assertJsonPath('data.total_hpp', 1100000)
            ->assertJsonPath('data.cashier_name', 'Test OWNER')
            ->assertJsonPath('data.status', 'LUNAS');

        $this->assertSame(4, $product->fresh()->product_quantity);
        $this->assertSame(0, $product->batches()->orderBy('purchase_date')->first()->remaining_qty);

        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(1800000, $j['1-1000']['debit']);
        $this->assertEquals(200000, $j['4-9000']['debit']);
        $this->assertEquals(2000000, $j['4-1000']['credit']);
        $this->assertEquals(1100000, $j['5-1000']['debit']);
        $this->assertEquals(1100000, $j['1-2000']['credit']);
    }

    public function test_qris_fee_is_booked_as_mdr_expense(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'fee_percentage' => 0.7, 'provider_name' => 'QRIS BCA']],
        ])->assertCreated();

        $res->assertJsonPath('data.fee_amount', 7000)->assertJsonPath('data.net_received', 993000);
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(993000, $j['1-1001']['debit']);
        $this->assertEquals(7000, $j['6-1009']['debit']);
    }

    public function test_qris_reference_must_be_settled(): void
    {
        $product = $this->makeProduct();
        $payload = [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'reference' => 'POS-TEST-'.uniqid()]],
        ];

        $this->mock(MidtransQrisService::class)
            ->shouldReceive('checkStatus')->once()->andReturn(['transaction_status' => 'pending']);
        $this->checkout($payload)->assertStatus(422);
        $this->assertSame(10, $product->fresh()->product_quantity);

        $this->mock(MidtransQrisService::class)
            ->shouldReceive('checkStatus')->once()->andReturn(['transaction_status' => 'settlement']);
        $this->checkout($payload)->assertCreated();
    }

    public function test_edc_credit_surcharge_is_revenue_and_mdr_is_expense(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'EDC_CREDIT', 'amount' => 1000000, 'fee_percentage' => 2, 'charge_to_customer' => true, 'edc_bank' => 'BCA', 'edc_type' => 'Credit']],
        ])->assertCreated();

        $res->assertJsonPath('data.total_amount', 1020000)->assertJsonPath('data.paid_amount', 1020000);
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(1000000, $j['1-1001']['debit']);
        $this->assertEquals(20000, $j['6-1009']['debit']);
        $this->assertEquals(20000, $j['4-2000']['credit']);
    }

    public function test_split_cash_and_edc_debit(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [
                ['method' => 'TUNAI', 'amount' => 400000, 'tendered' => 400000],
                ['method' => 'EDC_DEBIT', 'amount' => 600000, 'fee_percentage' => 0.5, 'edc_bank' => 'BCA', 'edc_type' => 'Debit'],
            ],
        ])->assertCreated();

        $res->assertJsonPath('data.payment_method', 'SPLIT')->assertJsonCount(2, 'data.payments');
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(400000, $j['1-1000']['debit']);
        $this->assertEquals(597000, $j['1-1001']['debit']);
        $this->assertEquals(3000, $j['6-1009']['debit']);
    }

    public function test_bon_creates_receivable_with_due_date(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'bon' => ['term_days' => 14],
        ])->assertCreated();

        $res->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.payment_method', 'BON')
            ->assertJsonPath('data.due_date', now()->addDays(14)->toDateString());
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(1000000, $j['1-1002']['debit']);
    }

    public function test_bon_with_payments_is_rejected(): void
    {
        $product = $this->makeProduct();
        $this->checkout([
            'items' => [$this->productLine($product)],
            'bon' => ['term_days' => 7],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->assertStatus(422);
    }

    public function test_service_and_manual_lines(): void
    {
        $service = ServiceMaster::create([
            'service_code' => 'JASA-'.uniqid(), 'service_name' => 'Spooring 3D', 'category' => 'SPOORING',
            'standard_price' => 150000, 'cost_price' => 0, 'is_active' => true,
        ]);
        $product = $this->makeProduct();

        $res = $this->checkout([
            'items' => [
                ['type' => 'SERVICE', 'service_id' => $service->id, 'name' => 'x', 'quantity' => 1, 'unit_price' => 150000],
                ['type' => 'PRODUCT', 'is_manual' => true, 'name' => 'Pentil Racing', 'quantity' => 4, 'unit_price' => 25000, 'cost_price' => 10000],
            ],
            'payments' => [['method' => 'TUNAI', 'amount' => 250000]],
        ])->assertCreated();

        // Jasa & item manual tidak menyentuh stok produk mana pun.
        $this->assertSame(10, $product->fresh()->product_quantity);
        $res->assertJsonPath('data.items.0.item_name', 'Spooring 3D')
            ->assertJsonPath('data.items.1.total_cost_hpp', 40000)
            ->assertJsonPath('data.total_hpp', 40000);

        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(150000, $j['4-1001']['credit']);
        $this->assertEquals(100000, $j['4-1000']['credit']);
        $this->assertArrayNotHasKey('5-1000', $j, 'HPP item manual tidak dijurnal ke persediaan');
    }

    public function test_vat_eleven_percent(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'tax_rate' => 11,
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1110000]],
        ])->assertCreated();

        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(110000, $j['2-1003']['credit']);
        $this->assertEquals(1110000, $j['1-1001']['debit']);
    }

    public function test_insufficient_stock_is_rejected_without_side_effects(): void
    {
        $product = $this->makeProduct(1000000, [[2, 600000, '2026-08-01']]);
        $this->checkout([
            'items' => [$this->productLine($product, 1), $this->productLine($product, 2)],
            'payments' => [['method' => 'TUNAI', 'amount' => 3000000]],
        ])->assertStatus(422)->assertJsonPath('message', "Stok {$product->product_name} tidak cukup (sisa 2).");

        $this->assertSame(2, $product->fresh()->product_quantity);
    }

    public function test_payment_total_must_match_amount_due(): void
    {
        $product = $this->makeProduct();
        $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TUNAI', 'amount' => 900000]],
        ])->assertStatus(422);
    }

    public function test_unknown_product_is_rejected(): void
    {
        $this->checkout([
            'items' => [['type' => 'PRODUCT', 'product_id' => 999999999, 'name' => 'Hantu', 'quantity' => 1, 'unit_price' => 1000]],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000]],
        ])->assertStatus(422);
    }

    public function test_listing_and_detail_return_receipts(): void
    {
        $product = $this->makeProduct();
        $id = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->json('data.id');

        $this->getJson("/api/v1/pos/transactions/{$id}")->assertOk()
            ->assertJsonPath('data.items.0.product.product_name', $product->product_name)
            ->assertJsonPath('data.journals.0.reference_type', 'POS_SALE');
        $this->getJson('/api/v1/pos/transactions')->assertOk()->assertJsonPath('data.0.id', $id);
    }
}
