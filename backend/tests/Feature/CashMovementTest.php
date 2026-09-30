<?php

namespace Tests\Feature;

use App\Models\CashSession;
use App\Models\JournalEntry;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\CashSessionService;
use App\Services\Accounting\FinancialReportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Mutasi kas pemilik: setor kas laci ke bank, prive (3-3000) dan setoran modal (3-1000).
 * Angka laporan dibandingkan sebelum/sesudah karena DB test berisi sisa data test lain.
 */
class CashMovementTest extends TestCase
{
    use DatabaseTransactions;

    private const FROM = '2021-06-01';

    private const TO = '2021-06-30';

    private function move(array $payload)
    {
        return $this->postJson('/api/v1/cash-movements', $payload + ['date' => '2021-06-10', 'description' => 'Uji mutasi kas']);
    }

    /** @return array<string, array{debit: float, credit: float}> */
    private function lines(array $journal): array
    {
        return collect($journal['lines'])->keyBy('account_code')->all();
    }

    private function cashFlow(): array
    {
        return app(CashFlowReport::class)->build(self::FROM, self::TO);
    }

    private function equity(): array
    {
        return app(FinancialReportService::class)->equityChanges(self::FROM, self::TO);
    }

    private function priveLine(): float
    {
        foreach (app(FinancialReportService::class)->balanceSheet(self::TO)['equity']['lines'] as $line) {
            if ($line['code'] === '3-3000') {
                return (float) $line['amount'];
            }
        }

        return 0.0;
    }

    public function test_deposit_moves_drawer_cash_to_the_bank_without_changing_total_cash(): void
    {
        $before = $this->cashFlow();

        $journal = $this->move(['type' => 'DEPOSIT', 'amount' => 300000])->assertCreated()->json('data');

        $this->assertSame('CASH_DEPOSIT', $journal['reference_type']);
        $this->assertStringStartsWith('KAS-202106-', $journal['reference_id']);
        $lines = $this->lines($journal);
        $this->assertEquals(300000, $lines['1-1001']['debit']);
        $this->assertEquals(300000, $lines['1-1000']['credit']);

        $after = $this->cashFlow();
        $this->assertEquals($before['net_change'], $after['net_change']);
        $this->assertEquals($before['operating']['net'], $after['operating']['net']);
        $this->assertEquals($before['financing']['net'], $after['financing']['net']);
        $this->assertEquals($before['ending_cash_drawer'] - 300000, $after['ending_cash_drawer']);
        $this->assertTrue($after['is_reconciled']);
    }

    public function test_owner_drawing_is_a_financing_outflow_and_a_prive_deduction_in_equity(): void
    {
        $cfBefore = $this->cashFlow();
        $eqBefore = $this->equity();
        $priveBefore = $this->priveLine();

        $journal = $this->move(['type' => 'DRAWING', 'account_code' => '1-1001', 'amount' => 200000])->assertCreated()->json('data');

        $this->assertSame('OWNER_DRAWING', $journal['reference_type']);
        $lines = $this->lines($journal);
        $this->assertEquals(200000, $lines['3-3000']['debit']);
        $this->assertEquals(200000, $lines['1-1001']['credit']);

        $this->assertEquals($cfBefore['financing']['equity'] - 200000, $this->cashFlow()['financing']['equity']);
        $eq = $this->equity();
        $this->assertEquals($eqBefore['owner_drawings'] + 200000, $eq['owner_drawings']);
        $this->assertEquals($eqBefore['owner_contributions'], $eq['owner_contributions']);
        $this->assertEquals(0, $eq['difference']);
        $this->assertEquals($priveBefore - 200000, $this->priveLine());
    }

    public function test_capital_injection_into_the_drawer_is_a_financing_inflow(): void
    {
        $cfBefore = $this->cashFlow();
        $eqBefore = $this->equity();

        $journal = $this->move(['type' => 'CAPITAL', 'account_code' => '1-1000', 'amount' => 500000])->assertCreated()->json('data');

        $this->assertSame('CAPITAL_INJECTION', $journal['reference_type']);
        $lines = $this->lines($journal);
        $this->assertEquals(500000, $lines['1-1000']['debit']);
        $this->assertEquals(500000, $lines['3-1000']['credit']);

        $this->assertEquals($cfBefore['financing']['equity'] + 500000, $this->cashFlow()['financing']['equity']);
        $eq = $this->equity();
        $this->assertEquals($eqBefore['owner_contributions'] + 500000, $eq['owner_contributions']);
        $this->assertEquals(0, $eq['difference']);
    }

    public function test_movement_input_is_validated(): void
    {
        $this->move(['type' => 'DRAWING', 'amount' => 1000])->assertStatus(422)->assertJsonValidationErrors('account_code');
        $this->move(['type' => 'LOAN', 'amount' => 1000])->assertStatus(422)->assertJsonValidationErrors('type');
        $this->move(['type' => 'DEPOSIT', 'amount' => 0])->assertStatus(422)->assertJsonValidationErrors('amount');
        $this->move(['type' => 'DEPOSIT', 'amount' => 1000, 'date' => now()->addDay()->toDateString()])
            ->assertStatus(422)->assertJsonValidationErrors('date');
    }

    public function test_a_drawer_movement_is_listed_and_counted_in_the_open_shift(): void
    {
        $session = CashSession::create([
            'user_id' => auth()->id(),
            'opened_at' => now(),
            'opening_float' => 0,
            'book_opening' => 0,
            'from_entry_id' => (int) JournalEntry::max('id'),
            'status' => CashSession::OPEN,
        ]);

        $this->move(['type' => 'DEPOSIT', 'amount' => 100000, 'date' => now()->toDateString()])->assertCreated();

        $lines = collect(CashSessionService::summary($session)['lines'])->keyBy('reference_type');
        $this->assertEquals(-100000, $lines['CASH_DEPOSIT']['amount']);
        $this->assertSame('Setor kas ke bank', $lines['CASH_DEPOSIT']['label']);

        $this->getJson('/api/v1/cash-movements')->assertOk()->assertJsonPath('data.0.reference_type', 'CASH_DEPOSIT');
    }

    public function test_only_the_cash_movement_key_can_move_cash(): void
    {
        foreach (['KASIR', 'GUDANG'] as $role) {
            $this->actingAsRole($role);
            $this->getJson('/api/v1/cash-movements')->assertForbidden();
            $this->move(['type' => 'DEPOSIT', 'amount' => 1000])->assertForbidden();
        }
    }
}
