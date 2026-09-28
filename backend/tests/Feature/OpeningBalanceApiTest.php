<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class OpeningBalanceApiTest extends TestCase
{
    use DatabaseTransactions;

    private function lines(array $journal): array
    {
        return collect($journal['lines'])->mapWithKeys(fn ($l) => [$l['account_code'] => [$l['debit'], $l['credit']]])->all();
    }

    public function test_opening_balances_are_posted_once_with_capital_as_the_balancing_line(): void
    {
        $this->getJson('/api/v1/accounting/opening-balance')->assertOk()->assertJsonPath('data', null);

        $res = $this->postJson('/api/v1/accounting/opening-balance', [
            'date' => '2025-01-01',
            'balances' => ['1-1000' => 1500000, '1-1001' => 35000000, '1-3000' => 14000000, '1-3999' => 2000000],
        ])->assertCreated()->assertJsonPath('data.reference_type', 'ACCOUNT_OPENING');

        $this->assertEquals([
            '1-1000' => [1500000, 0], '1-1001' => [35000000, 0], '1-3000' => [14000000, 0],
            '1-3999' => [0, 2000000], '3-1000' => [0, 48500000],
        ], $this->lines($res->json('data')));

        $this->getJson('/api/v1/accounting/opening-balance')->assertOk()->assertJsonPath('data.reference_type', 'ACCOUNT_OPENING');
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-1000' => 1]])->assertStatus(422);
    }

    public function test_accumulated_deficit_is_debited_to_retained_earnings(): void
    {
        $res = $this->postJson('/api/v1/accounting/opening-balance', [
            'date' => '2025-01-01',
            'balances' => ['1-1000' => 1000000, '3-2000' => -250000],
        ])->assertCreated();

        $this->assertEquals([
            '1-1000' => [1000000, 0], '3-2000' => [250000, 0], '3-1000' => [0, 1250000],
        ], $this->lines($res->json('data')));
    }

    public function test_subledger_accounts_and_negative_assets_are_rejected(): void
    {
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-2000' => 100]])->assertStatus(422);
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-1000' => -100]])
            ->assertStatus(422)->assertJsonValidationErrors('balances.1-1000');
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => []])->assertStatus(422);
    }

    public function test_kasir_is_denied(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/opening-balance')->assertForbidden();
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-1000' => 1]])->assertForbidden();
    }
}
