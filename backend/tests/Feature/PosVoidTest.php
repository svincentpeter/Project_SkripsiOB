<?php

namespace Tests\Feature;

use App\Models\ReceivablePayment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class PosVoidTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function cashSale($product, int $qty = 2)
    {
        return $this->checkout([
            'items' => [$this->productLine($product, $qty)],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000 * $qty]],
        ])->assertCreated();
    }

    public function test_void_restores_fifo_batches_and_reverses_journal(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $sale = $this->cashSale($product);

        $res = $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Salah input ukuran'])
            ->assertOk()
            ->assertJsonPath('data.status', 'VOID')
            ->assertJsonPath('data.voided_by', 'Test OWNER')
            ->assertJsonCount(2, 'data.journals');

        $this->assertSame(6, $product->fresh()->product_quantity);
        $this->assertEquals([1, 5], $product->batches()->orderBy('purchase_date')->pluck('remaining_qty')->all());

        $reversal = $this->journalByAccount($res->json('data.reference'), 'POS_SALE_VOID');
        $this->assertEquals(2000000, $reversal['1-1000']['credit']);
        $this->assertEquals(2000000, $reversal['4-1000']['debit']);
        $this->assertEquals(1100000, $reversal['1-2000']['debit']);
    }

    public function test_double_void_is_rejected(): void
    {
        $id = $this->cashSale($this->makeProduct())->json('data.id');
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Batal beli'])->assertOk();
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Batal beli'])->assertStatus(422);
    }

    public function test_bon_with_settlement_cannot_be_voided(): void
    {
        $product = $this->makeProduct();
        $id = $this->checkout(['items' => [$this->productLine($product)], 'bon' => ['term_days' => 7]])->json('data.id');
        ReceivablePayment::create(['sale_id' => $id, 'payment_date' => now(), 'amount' => 100000, 'account_code' => '1-1000']);

        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Batal beli'])->assertStatus(422);
    }

    public function test_reason_is_required_and_kasir_cannot_void_by_default(): void
    {
        $id = $this->cashSale($this->makeProduct())->json('data.id');
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'x'])->assertStatus(422);

        $this->actingAsRole('KASIR');
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Batal beli'])->assertForbidden();
    }
}
