<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Models\Supplier;
use App\Services\Accounting\PeriodLock;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Tanggal dokumen: pembayaran di antara tanggal faktur dan hari ini, penerimaan barang tidak di masa depan,
 * dan kunci periode membandingkan tanggal yang sudah dinormalkan.
 */
class DocumentDateValidationTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function tempoReceipt(Supplier $supplier): int
    {
        return $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $this->makeProduct()->id, 'quantity' => 2, 'batch_cost' => 500000,
            'purchase_date' => '2026-09-20', 'supplier_id' => $supplier->id, 'payment_method' => 'TEMPO',
        ])->assertCreated()->json('data.purchase.id');
    }

    public function test_period_lock_compares_normalized_dates(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        $this->expectException(PosRuleException::class);
        PeriodLock::assertOpen('2020-01-31 10:00:00');
    }

    public function test_payment_date_must_fall_between_invoice_date_and_today(): void
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-'.uniqid(), 'supplier_name' => 'PT Tanggal '.uniqid(),
            'phone' => '0811', 'payment_terms_days' => 30, 'is_active' => true,
        ]);
        $id = $this->tempoReceipt($supplier);

        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 100000, 'account_code' => '1-1001', 'payment_date' => '2026-09-19'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sebelum tanggal faktur'));

        $tomorrow = now()->addDay()->toDateString();
        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 100000, 'account_code' => '1-1001', 'payment_date' => $tomorrow])
            ->assertStatus(422)->assertJsonValidationErrors('payment_date');
        $this->postJson('/api/v1/accounting/accounts-payable/pay', [
            'supplier_id' => $supplier->id, 'amount' => 100000, 'payment_method' => 'BANK_BCA', 'payment_date' => $tomorrow,
        ])->assertStatus(422)->assertJsonValidationErrors('payment_date');

        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 100000, 'account_code' => '1-1001', 'payment_date' => '2026-09-20'])
            ->assertCreated();
    }

    public function test_goods_receipt_date_cannot_be_in_the_future(): void
    {
        $product = $this->makeProduct();

        $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $product->id, 'quantity' => 1, 'batch_cost' => 500000, 'source_name' => 'Toko Grosir',
            'payment_method' => 'TUNAI', 'purchase_date' => now()->addDay()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('purchase_date');

        $this->assertSame(10, $product->fresh()->product_quantity);
    }
}
