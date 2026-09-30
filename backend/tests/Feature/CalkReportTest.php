<?php

namespace Tests\Feature;

use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CalkReportTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/reports/calk';

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), 'TEST', 'CALK-'.uniqid(), 'Uji CALK', $date);
    }

    public function test_calk_states_compliance_entity_and_policies(): void
    {
        $data = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data');

        $this->assertSame('2019-06', $data['period']);
        $this->assertSame('2019-06-30', $data['end_date']);
        $this->assertSame('Omah Ban Cabang 3', $data['entity']['name']);
        $this->assertStringContainsString('SAK EMKM', $data['compliance']);

        $policies = implode(' ', array_column($data['policies'], 'body'));
        $this->assertStringContainsString('FIFO', $policies);
        $this->assertStringContainsString('garis lurus', $policies);
        $this->assertStringContainsString('PPh Final sebesar 0,5%', $policies);
        $this->assertStringContainsString('non-PKP', $policies);
    }

    public function test_notes_agree_with_the_ledger_at_period_end(): void
    {
        $this->postJournal('2019-06-03', [['1-1001', 5000000, 0], ['3-1000', 0, 5000000]]);
        $this->postJournal('2019-06-04', [['1-1100', 1200000, 0], ['1-1001', 0, 1200000]]);
        $this->postJournal('2019-06-30', [['6-1001', 300000, 0], ['2-1100', 0, 300000]]);

        $purchase = Purchase::create([
            'purchase_number' => 'GR-CALK-'.uniqid(), 'supplier_name' => 'PT Uji Ban', 'purchase_date' => '2019-06-05',
            'payment_method' => 'TEMPO', 'total_amount' => 1000000, 'paid_amount' => 400000, 'status' => 'SEBAGIAN',
        ]);
        $this->postJournal('2019-06-05', [['1-2000', 1000000, 0], ['2-1000', 0, 1000000]]);
        PurchasePayment::create(['purchase_id' => $purchase->id, 'payment_date' => '2019-06-20', 'amount' => 400000, 'account_code' => '1-1001']);
        $this->postJournal('2019-06-20', [['2-1000', 400000, 0], ['1-1001', 0, 400000]]);
        // Pembayaran sesudah akhir periode tidak mengurangi hutang per 30 Juni.
        PurchasePayment::create(['purchase_id' => $purchase->id, 'payment_date' => '2019-07-02', 'amount' => 100000, 'account_code' => '1-1001']);

        $notes = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data.notes');

        $cash = CashFlowReport::cashBalances('2019-06-30');
        $this->assertEquals(round($cash['1-1000'] + $cash['1-1001'], 2), $notes['cash_and_bank']['total']);
        $this->assertSame(['1-1000', '1-1001'], array_column($notes['cash_and_bank']['lines'], 'code'));

        $sheet = app(FinancialReportService::class)->balanceSheet('2019-06-30');
        $this->assertEquals($sheet['equity']['total'], $notes['equity']['total']);
        $prepaid = collect($sheet['current_assets']['lines'])->firstWhere('code', '1-1100')['amount'];
        $accrued = collect($sheet['liabilities']['lines'])->firstWhere('code', '2-1100')['amount'];
        $this->assertEquals($prepaid, $notes['prepaid_expenses']['balance']);
        $this->assertEquals($accrued, $notes['accrued_expenses']['balance']);

        // Setiap angka buku besar di CALK sama dengan baris laporan posisi keuangan pada tanggal yang sama.
        $line = fn (string $section, string $code) => (float) (collect($sheet[$section]['lines'])->firstWhere('code', $code)['amount'] ?? 0);
        foreach ($notes['cash_and_bank']['lines'] as $cashLine) {
            $this->assertEquals($line('current_assets', $cashLine['code']), $cashLine['amount']);
        }
        $this->assertEquals($line('current_assets', '1-2000'), $notes['inventory']['ledger_balance']);
        $this->assertEquals($line('fixed_assets', '1-3000'), $notes['fixed_assets']['ledger_cost']);
        $this->assertEquals(-$line('fixed_assets', '1-3999'), $notes['fixed_assets']['ledger_accumulated']);
        $this->assertEquals($line('liabilities', '2-1000'), $notes['payables']['ledger_balance']);
        $this->assertEquals($sheet['equity']['lines'], $notes['equity']['lines']);

        $supplier = collect($notes['payables']['suppliers'])->firstWhere('supplier_name', 'PT Uji Ban');
        $this->assertEquals(600000, $supplier['amount']);
        $this->assertEquals(
            round($notes['payables']['ledger_balance'] - $notes['payables']['subledger_total'], 2),
            $notes['payables']['other_adjustments']
        );
    }

    public function test_fixed_asset_note_follows_the_register_and_depreciation(): void
    {
        $this->postJson('/api/v1/accounting/fixed-assets', [
            'name' => 'Kompresor Angin', 'category' => 'PERALATAN_BENGKEL', 'acquisition_date' => '2019-06-03',
            'acquisition_cost' => 2400000, 'useful_life_months' => 24, 'funding' => 'TUNAI',
        ])->assertCreated();
        $this->postJson('/api/v1/accounting/fixed-assets/depreciation', ['period' => '2019-06'])->assertCreated();

        $note = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data.notes.fixed_assets');
        $asset = collect($note['assets'])->firstWhere('name', 'Kompresor Angin');

        $this->assertEquals(2400000, $asset['cost']);
        $this->assertEquals(100000, $asset['accumulated']);
        $this->assertEquals(2300000, $asset['book_value']);
        $this->assertSame('Peralatan & Mesin Bengkel', $asset['category']);
        $this->assertEquals(100000, $note['depreciation_expense']);
        $opex = app(FinancialReportService::class)->incomeStatement('2019-06-01', '2019-06-30')['operating_expenses']['lines'];
        $this->assertEquals(collect($opex)->firstWhere('code', '6-1011')['amount'], $note['depreciation_expense']);

        $this->getJson(self::URL.'?period=2019-05')->assertOk()->assertJsonPath('data.notes.fixed_assets.assets', []);
    }

    public function test_inventory_breakdown_is_only_given_for_the_current_month(): void
    {
        $this->getJson(self::URL.'?period=2019-06')
            ->assertOk()
            ->assertJsonPath('data.notes.inventory.method', 'FIFO')
            ->assertJsonPath('data.notes.inventory.breakdown', [])
            ->assertJsonPath('data.notes.inventory.breakdown_as_of', null);

        $this->getJson(self::URL.'?period='.now()->format('Y-m'))
            ->assertOk()
            ->assertJsonPath('data.notes.inventory.breakdown_as_of', now()->toDateString());
    }

    public function test_period_is_required_and_cannot_be_in_the_future(): void
    {
        $this->getJson(self::URL)->assertStatus(422)->assertJsonValidationErrors('period');
        $this->getJson(self::URL.'?period='.now()->addMonthNoOverflow()->format('Y-m'))->assertStatus(422);
    }

    public function test_roles_without_report_access_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::URL.'?period=2019-06')->assertForbidden();
    }
}
