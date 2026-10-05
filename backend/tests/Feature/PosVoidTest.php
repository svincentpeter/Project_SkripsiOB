<?php

namespace Tests\Feature;

use App\Models\QrisTransaction;
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

        // Pembalik tertaut ke jurnal penjualannya ("Dibalik oleh" di jurnal umum, pasangan di rekonsiliasi bank).
        $original = \App\Models\JournalEntry::where('reference_type', 'POS_SALE')->where('reference_id', $res->json('data.reference'))->firstOrFail();
        $this->assertTrue(\App\Models\JournalEntry::where('reference_type', 'POS_SALE_VOID')->where('reversal_of_id', $original->id)->exists());
    }

    public function test_void_does_not_release_the_qris_order(): void
    {
        $product = $this->makeProduct();
        $orderId = $this->qrisOrder(1000000);
        $payload = [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'provider_id' => $this->paymentProvider('qris')->id, 'reference' => $orderId]],
        ];
        $id = $this->checkout($payload)->assertCreated()->json('data.id');
        $linked = QrisTransaction::where('order_id', $orderId)->value('sale_payment_id');

        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Pelanggan batal'])->assertOk();

        $this->assertEquals($linked, QrisTransaction::where('order_id', $orderId)->value('sale_payment_id'));
        $this->checkout($payload)->assertStatus(422)
            ->assertJsonPath('message', "Pembayaran QRIS {$orderId} sudah dipakai untuk nota lain.");
    }

    public function test_double_void_is_rejected(): void
    {
        $id = $this->cashSale($this->makeProduct())->json('data.id');
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Batal beli'])->assertOk();
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Batal beli'])->assertStatus(422);
    }

    public function test_void_of_split_cash_and_qris_sale_reverses_mdr(): void
    {
        $product = $this->makeProduct();
        $sale = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [
                ['method' => 'TUNAI', 'amount' => 400000, 'tendered' => 500000],
                ['method' => 'QRIS', 'amount' => 600000, 'provider_id' => $this->paymentProvider('qris', 0.5)->id],
            ],
        ])->assertCreated();

        $res = $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Pelanggan batal'])
            ->assertOk()
            ->assertJsonPath('data.status', 'VOID');

        $reversal = $this->journalByAccount($res->json('data.reference'), 'POS_SALE_VOID');
        $this->assertEquals(400000, $reversal['1-1000']['credit']);
        $this->assertEquals(597000, $reversal['1-1001']['credit']);
        $this->assertEquals(3000, $reversal['6-1009']['credit']);
        $this->assertEquals(1000000, $reversal['4-1000']['debit']);
        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_reason_is_required_and_kasir_cannot_void_by_default(): void
    {
        $id = $this->cashSale($this->makeProduct())->json('data.id');
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'x'])->assertStatus(422);

        $this->actingAsRole('KASIR');
        $this->postJson("/api/v1/pos/transactions/{$id}/void", ['reason' => 'Batal beli'])->assertForbidden();
    }
}
