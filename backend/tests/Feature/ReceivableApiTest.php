<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class ReceivableApiTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function bonSale(): array
    {
        $product = $this->makeProduct();
        $res = $this->checkout(['items' => [$this->productLine($product)], 'bon' => ['term_days' => 30]])->assertCreated();

        return [$res->json('data.id'), $res->json('data.reference')];
    }

    public function test_open_receivables_are_listed(): void
    {
        [$id] = $this->bonSale();
        $row = collect($this->getJson('/api/v1/receivables')->assertOk()->json('data'))->firstWhere('sale_id', $id);

        $this->assertSame('BELUM_LUNAS', $row['status']);
        $this->assertEquals(1000000, $row['remaining_amount']);
    }

    public function test_partial_then_full_settlement(): void
    {
        [$id, $ref] = $this->bonSale();

        $this->postJson("/api/v1/receivables/{$id}/payments", ['amount' => 400000, 'account_code' => '1-1000'])
            ->assertCreated()
            ->assertJsonPath('data.receivable.status', 'SEBAGIAN')
            ->assertJsonPath('data.receivable.remaining_amount', 600000)
            ->assertJsonPath('data.journal.lines.0.account_code', '1-1000');

        $this->postJson("/api/v1/receivables/{$id}/payments", ['amount' => 600000, 'account_code' => '1-1001'])
            ->assertCreated()
            ->assertJsonPath('data.receivable.status', 'LUNAS');

        $this->getJson("/api/v1/pos/transactions/{$id}")->assertJsonPath('data.status', 'LUNAS');
        $j = $this->journalByAccount($ref, 'RECEIVABLE_PAYMENT');
        $this->assertEquals(400000, $j['1-1002']['credit']);
    }

    public function test_overpayment_is_rejected(): void
    {
        [$id] = $this->bonSale();
        $this->postJson("/api/v1/receivables/{$id}/payments", ['amount' => 1000001, 'account_code' => '1-1000'])
            ->assertStatus(422);
    }

    public function test_gudang_cannot_access_receivables(): void
    {
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/receivables')->assertForbidden();
    }
}
