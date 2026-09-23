<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function book($product, float $dp = 300000, string $method = 'TUNAI')
    {
        return $this->postJson('/api/v1/bookings', [
            'customer_name' => 'Sari', 'customer_phone' => '0812-1111-2222', 'vehicle_plate' => 'AA 2 CC',
            'items' => [$this->productLine($product, 1)],
            'dp_amount' => $dp,
            'payment_method' => $method,
        ]);
    }

    public function test_create_booking_books_deposit_liability(): void
    {
        $res = $this->book($this->makeProduct())->assertCreated()
            ->assertJsonPath('data.status', 'ACTIVE')
            ->assertJsonPath('data.estimated_total', 1000000)
            ->assertJsonPath('data.remaining_amount', 700000);

        $this->assertMatchesRegularExpression('/^BK-\d{6}-\d{4}$/', $res->json('data.booking_number'));
        $j = $this->journalByAccount($res->json('data.booking_number'), 'BOOKING_DP');
        $this->assertEquals(300000, $j['1-1000']['debit']);
        $this->assertEquals(300000, $j['2-1004']['credit']);
    }

    public function test_deposit_above_estimate_is_rejected(): void
    {
        $this->book($this->makeProduct(), 1000001)->assertStatus(422);
    }

    public function test_cancel_refunds_deposit_once(): void
    {
        $res = $this->book($this->makeProduct(), 300000, 'TRANSFER_BCA')->assertCreated();
        $id = $res->json('data.id');

        $this->postJson("/api/v1/bookings/{$id}/cancel", ['refund_account_code' => '1-1001', 'reason' => 'Pelanggan batal'])
            ->assertOk()->assertJsonPath('data.status', 'CANCELLED');
        $j = $this->journalByAccount($res->json('data.booking_number'), 'BOOKING_DP_REFUND');
        $this->assertEquals(300000, $j['2-1004']['debit']);
        $this->assertEquals(300000, $j['1-1001']['credit']);

        $this->postJson("/api/v1/bookings/{$id}/cancel", ['refund_account_code' => '1-1001'])->assertStatus(422);
    }

    public function test_checkout_with_booking_uses_deposit_and_void_reactivates_it(): void
    {
        $product = $this->makeProduct();
        $bookingId = $this->book($product)->json('data.id');

        $sale = $this->checkout([
            'booking_id' => $bookingId,
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TUNAI', 'amount' => 700000]],
        ])->assertCreated()->assertJsonPath('data.dp_applied', 300000);

        $j = $this->journalByAccount($sale->json('data.reference'));
        $this->assertEquals(300000, $j['2-1004']['debit']);
        $this->assertEquals(700000, $j['1-1000']['debit']);

        $this->getJson('/api/v1/bookings?status=CONVERTED')->assertOk()->assertJsonFragment(['id' => $bookingId, 'status' => 'CONVERTED']);
        $this->checkout([
            'booking_id' => $bookingId,
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TUNAI', 'amount' => 700000]],
        ])->assertStatus(422);

        $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Salah nota'])->assertOk();
        $this->getJson('/api/v1/bookings')->assertJsonFragment(['id' => $bookingId, 'status' => 'ACTIVE']);
    }

    public function test_kasir_can_book_but_gudang_cannot(): void
    {
        $product = $this->makeProduct();
        $this->actingAsRole('KASIR');
        $this->book($product)->assertCreated();

        $this->actingAsRole('GUDANG');
        $this->book($product)->assertForbidden();
        $this->getJson('/api/v1/bookings')->assertForbidden();
    }
}
