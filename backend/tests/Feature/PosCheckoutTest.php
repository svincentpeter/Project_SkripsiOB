<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
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
            ->assertJsonPath('data.status', 'LUNAS')
            ->assertJsonMissingPath('data.dp_applied')
            ->assertJsonMissingPath('data.booking_id')
            ->assertJsonMissingPath('data.due_date')
            ->assertJsonMissingPath('data.receivable_paid')
            ->assertJsonMissingPath('data.surcharge_amount');

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

    public function test_edc_methods_are_rejected(): void
    {
        $product = $this->makeProduct();

        foreach (['EDC_DEBIT', 'EDC_CREDIT'] as $method) {
            $this->checkout([
                'items' => [$this->productLine($product)],
                'payments' => [['method' => $method, 'amount' => 1000000, 'fee_percentage' => 2]],
            ])->assertStatus(422)->assertJsonValidationErrors('payments.0.method');
        }

        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_split_cash_and_qris_books_mdr_to_expense_without_surcharge(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [
                ['method' => 'TUNAI', 'amount' => 400000, 'tendered' => 400000],
                ['method' => 'QRIS', 'amount' => 600000, 'fee_percentage' => 0.5, 'provider_name' => 'QRIS BCA'],
            ],
        ])->assertCreated();

        $res->assertJsonPath('data.payment_method', 'SPLIT')
            ->assertJsonPath('data.status', 'LUNAS')
            ->assertJsonPath('data.total_amount', 1000000)
            ->assertJsonPath('data.paid_amount', 1000000)
            ->assertJsonPath('data.fee_amount', 3000)
            ->assertJsonCount(2, 'data.payments')
            ->assertJsonMissingPath('data.payments.1.edc_bank')
            ->assertJsonMissingPath('data.payments.1.surcharge_amount');

        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(400000, $j['1-1000']['debit']);
        $this->assertEquals(597000, $j['1-1001']['debit']);
        $this->assertEquals(3000, $j['6-1009']['debit']);
        $this->assertEquals(1000000, $j['4-1000']['credit']);
        $this->assertArrayNotHasKey('4-2000', $j);
        $this->assertArrayNotHasKey('1-1002', $j);
        $this->assertArrayNotHasKey('2-1004', $j);
    }

    public function test_bon_checkout_is_rejected(): void
    {
        $product = $this->makeProduct();

        $this->checkout([
            'items' => [$this->productLine($product)],
            'bon' => ['term_days' => 14],
        ])->assertStatus(422)->assertJsonValidationErrors('bon');

        $this->checkout([
            'items' => [$this->productLine($product)],
            'bon' => ['term_days' => 7],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->assertStatus(422)->assertJsonValidationErrors('bon');

        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_booking_id_is_rejected(): void
    {
        $product = $this->makeProduct();

        $this->checkout([
            'items' => [$this->productLine($product)],
            'booking_id' => 1,
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->assertStatus(422)->assertJsonValidationErrors('booking_id');

        $this->assertSame(10, $product->fresh()->product_quantity);
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

    public function test_zero_value_nota_is_saved_without_journal_and_can_be_voided(): void
    {
        $service = ServiceMaster::create([
            'service_code' => 'JASA-'.uniqid(), 'service_name' => 'Cek Tekanan Angin', 'category' => 'LAINNYA',
            'standard_price' => 0, 'cost_price' => 0, 'is_active' => true,
        ]);

        $res = $this->checkout([
            'items' => [['type' => 'SERVICE', 'service_id' => $service->id, 'name' => 'x', 'quantity' => 1, 'unit_price' => 0]],
            'payments' => [],
        ])->assertCreated()
            ->assertJsonPath('data.total_amount', 0)
            ->assertJsonPath('data.status', 'LUNAS')
            ->assertJsonPath('data.journals', []);

        $reference = $res->json('data.reference');
        $this->assertFalse(JournalEntry::where('reference_id', $reference)->exists());

        // Void nota tanpa jurnal: tidak ada jurnal pembalik yang dibuat.
        $this->postJson("/api/v1/pos/transactions/{$res->json('data.id')}/void", ['reason' => 'Salah input'])->assertOk();
        $this->assertFalse(JournalEntry::where('reference_id', $reference)->exists());
    }

    public function test_zero_value_manual_line_checkout_succeeds_without_journal(): void
    {
        $res = $this->checkout([
            'items' => [['type' => 'PRODUCT', 'is_manual' => true, 'name' => 'Pentil Bonus', 'quantity' => 1, 'unit_price' => 0, 'cost_price' => 0]],
        ])->assertCreated()->assertJsonPath('data.journals', []);

        $this->assertFalse(JournalEntry::where('reference_id', $res->json('data.reference'))->exists());
    }

    public function test_sale_never_carries_ppn(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'tax_rate' => 11,
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000]],
        ])->assertCreated();

        $this->assertEquals(1000000, $res->json('data.total_amount'));
        $this->assertArrayNotHasKey('tax_amount', $res->json('data'));
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertArrayNotHasKey('2-1003', $j);
        $this->assertEquals(1000000, $j['1-1001']['debit']);
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
