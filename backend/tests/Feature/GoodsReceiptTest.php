<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Supplier;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class GoodsReceiptTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function supplier(int $terms = 14): Supplier
    {
        return Supplier::create([
            'supplier_code' => 'SUP-'.uniqid(), 'supplier_name' => 'PT Ban Uji '.uniqid(),
            'phone' => '0811', 'payment_terms_days' => $terms, 'is_active' => true,
        ]);
    }

    private function restock(Product $product, array $extra)
    {
        return $this->postJson('/api/v1/inventory/restock', $extra + [
            'product_id' => $product->id, 'quantity' => 4, 'batch_cost' => 500000, 'purchase_date' => '2026-09-20',
        ]);
    }

    public function test_cash_receipt_adds_batch_purchase_and_journal_keeping_valuation_aligned(): void
    {
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
        $product = $this->makeProduct(800000, [[2, 450000, '2026-08-01']]);
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();

        $res = $this->restock($product, ['source_name' => 'Toko Grosir', 'payment_method' => 'TUNAI'])->assertCreated()
            ->assertJsonPath('data.purchase.status', 'LUNAS')
            ->assertJsonPath('data.purchase.total_amount', 2000000);

        $this->assertMatchesRegularExpression('/^GR-\d{6}-\d{4}$/', $res->json('data.purchase.purchase_number'));
        $this->assertSame(6, $product->fresh()->product_quantity);
        $j = $this->journalByAccount($res->json('data.purchase.purchase_number'), 'PURCHASE');
        $this->assertEquals(2000000, $j['1-2000']['debit']);
        $this->assertEquals(2000000, $j['1-1000']['credit']);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_tempo_receipt_creates_payable_with_supplier_terms(): void
    {
        $supplier = $this->supplier(14);
        $res = $this->restock($this->makeProduct(), ['supplier_id' => $supplier->id, 'payment_method' => 'TEMPO', 'supplier_invoice' => 'INV-77'])
            ->assertCreated()
            ->assertJsonPath('data.purchase.status', 'BELUM_LUNAS')
            ->assertJsonPath('data.purchase.due_date', '2026-10-04')
            ->assertJsonPath('data.purchase.supplier_name', $supplier->supplier_name);

        $j = $this->journalByAccount($res->json('data.purchase.purchase_number'), 'PURCHASE');
        $this->assertEquals(2000000, $j['2-1000']['credit']);

        $this->getJson('/api/v1/purchases?status=open')->assertOk()
            ->assertJsonFragment(['purchase_number' => $res->json('data.purchase.purchase_number'), 'remaining_amount' => 2000000]);
        $this->getJson('/api/v1/accounting/accounts-payable')->assertOk()
            ->assertJsonFragment(['supplier_id' => $supplier->id, 'remaining_debt' => 2000000]);
    }

    public function test_pay_invoice_partially_then_fully_and_reject_overpayment(): void
    {
        $supplier = $this->supplier();
        $id = $this->restock($this->makeProduct(), ['supplier_id' => $supplier->id, 'payment_method' => 'TEMPO'])->json('data.purchase.id');

        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 2000001, 'account_code' => '1-1001'])->assertStatus(422);

        $res = $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 500000, 'account_code' => '1-1000'])
            ->assertCreated()->assertJsonPath('data.purchase.status', 'SEBAGIAN');
        $lines = collect($res->json('data.journal.lines'));
        $this->assertEquals(500000, $lines->firstWhere('account_code', '2-1000')['debit']);
        $this->assertEquals(500000, $lines->firstWhere('account_code', '1-1000')['credit']);

        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 1500000, 'account_code' => '1-1001'])
            ->assertCreated()->assertJsonPath('data.purchase.status', 'LUNAS');
        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 1, 'account_code' => '1-1001'])->assertStatus(422);
    }

    public function test_supplier_payment_is_allocated_to_oldest_due_invoice(): void
    {
        $supplier = $this->supplier();
        $product = $this->makeProduct();
        $first = $this->restock($product, ['supplier_id' => $supplier->id, 'payment_method' => 'TEMPO', 'due_date' => '2026-10-01'])->json('data.purchase.id');
        $second = $this->restock($product, ['supplier_id' => $supplier->id, 'payment_method' => 'TEMPO', 'due_date' => '2026-11-01'])->json('data.purchase.id');

        $this->postJson('/api/v1/accounting/accounts-payable/pay', [
            'supplier_id' => $supplier->id, 'amount' => 2500000, 'payment_method' => 'BANK_BCA',
        ])->assertOk()->assertJsonCount(2, 'data');

        $purchases = collect($this->getJson('/api/v1/purchases')->json('data'))->keyBy('id');
        $this->assertSame('LUNAS', $purchases[$first]['status']);
        $this->assertEquals(500000, $purchases[$second]['paid_amount']);

        $this->postJson('/api/v1/accounting/accounts-payable/pay', [
            'supplier_id' => $supplier->id, 'amount' => 1500001, 'payment_method' => 'BANK_BCA',
        ])->assertStatus(422);
    }

    public function test_permissions(): void
    {
        $product = $this->makeProduct();
        $this->actingAsRole('KASIR');
        $this->restock($product, ['source_name' => 'X', 'payment_method' => 'TUNAI'])->assertForbidden();

        $this->actingAsRole('GUDANG');
        $this->restock($product, ['source_name' => 'X', 'payment_method' => 'TUNAI'])->assertCreated();
        $this->getJson('/api/v1/purchases')->assertOk();
        $this->postJson('/api/v1/purchases/1/payments', ['amount' => 1, 'account_code' => '1-1000'])->assertForbidden();
    }
}
