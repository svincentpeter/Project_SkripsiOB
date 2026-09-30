<?php

namespace Tests\Feature;

use App\Models\BankReconciliation;
use App\Models\FixedAsset;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\PurchaseReturn;
use App\Services\Accounting\BankReconciliationService;
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

    private function tempoPurchase(string $supplier, string $date, float $total): Purchase
    {
        $purchase = Purchase::create([
            'purchase_number' => 'GR-CALK-'.uniqid(), 'supplier_name' => $supplier, 'purchase_date' => $date,
            'payment_method' => 'TEMPO', 'total_amount' => $total, 'paid_amount' => 0, 'status' => 'BELUM_LUNAS',
        ]);
        $this->postJournal($date, [['1-2000', $total, 0], ['2-1000', 0, $total]]);

        return $purchase;
    }

    /** Retur/pembatalan seperti PurchaseReturnService: hutang berkurang sebesar payable_amount pada return_date. */
    private function returnGoods(Purchase $purchase, string $kind, string $date, float $payable): void
    {
        PurchaseReturn::create([
            'reference' => 'RTB-CALK-'.uniqid(), 'purchase_id' => $purchase->id, 'kind' => $kind, 'return_date' => $date,
            'reason' => 'uji', 'quantity' => 1, 'total_amount' => $payable, 'payable_amount' => $payable,
        ]);
        $this->postJournal($date, [['2-1000', $payable, 0], ['1-2000', 0, $payable]]);
    }

    public function test_payables_net_returns_and_cancellations_dated_within_the_period(): void
    {
        $baseline = fn (string $period) => $this->getJson(self::URL.'?period='.$period)->json('data.notes.payables.other_adjustments');
        $juneBefore = $baseline('2019-06');
        $mayBefore = $baseline('2019-05');

        $cancelled = $this->tempoPurchase('PT Batal Uji', '2019-05-10', 800000);
        $this->returnGoods($cancelled, 'CANCEL', '2019-06-12', 800000);
        $partial = $this->tempoPurchase('PT Retur Uji', '2019-06-05', 1000000);
        $this->returnGoods($partial, 'RETURN', '2019-06-15', 250000);

        $june = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data.notes.payables');
        $this->assertNull(collect($june['suppliers'])->firstWhere('supplier_name', 'PT Batal Uji'));
        $this->assertEquals(750000, collect($june['suppliers'])->firstWhere('supplier_name', 'PT Retur Uji')['amount']);
        $this->assertEquals($juneBefore, $june['other_adjustments']);

        // Per akhir Mei faktur itu belum dibatalkan, jadi masih terhutang penuh.
        $may = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data.notes.payables');
        $this->assertEquals(800000, collect($may['suppliers'])->firstWhere('supplier_name', 'PT Batal Uji')['amount']);
        $this->assertEquals($mayBefore, $may['other_adjustments']);
    }

    public function test_cash_note_copies_the_bank_reconciliation_when_one_exists(): void
    {
        $this->getJson(self::URL.'?period=2019-06')->assertOk()
            ->assertJsonPath('data.notes.cash_and_bank.bank_statement_balance', null)
            ->assertJsonPath('data.notes.cash_and_bank.bank_reconciled', null);

        BankReconciliation::create(['period' => '2019-06', 'statement_ending_balance' => 1234567, 'branch_id' => 3]);
        $report = app(BankReconciliationService::class)->report('2019-06');

        $cash = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data.notes.cash_and_bank');
        $this->assertEquals(1234567, $cash['bank_statement_balance']);
        $this->assertSame($report['is_reconciled'], $cash['bank_reconciled']);
    }

    public function test_asset_voided_after_the_period_end_is_still_listed_for_that_period(): void
    {
        $id = $this->postJson('/api/v1/accounting/fixed-assets', [
            'name' => 'Dongkrak Buaya', 'category' => 'PERALATAN_BENGKEL', 'acquisition_date' => '2019-06-03',
            'acquisition_cost' => 1200000, 'useful_life_months' => 12, 'funding' => 'TUNAI',
        ])->assertCreated()->json('data.asset.id');
        $this->postJson("/api/v1/accounting/fixed-assets/{$id}/void", ['reason' => 'salah input'])->assertOk();

        $listed = fn (string $period) => collect($this->getJson(self::URL.'?period='.$period)->assertOk()->json('data.notes.fixed_assets.assets'))
            ->contains('name', 'Dongkrak Buaya');
        $this->assertTrue($listed('2019-06'));
        $this->assertFalse($listed(now()->format('Y-m')));

        FixedAsset::whereKey($id)->update(['voided_at' => '2019-07-01 00:00:00']);
        $this->assertTrue($listed('2019-06'));
        FixedAsset::whereKey($id)->update(['voided_at' => '2019-06-30 23:59:59']);
        $this->assertFalse($listed('2019-06'));
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
