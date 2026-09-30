<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\RolePermission;
use App\Services\Accounting\CashFlowReport;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Fondasi SP4: akun baru SAK EMKM, kunci izin, akun kontrol aset tetap, dan kelompok arus kas.
 */
class SakEmkmFoundationTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), 'TEST', 'SAK-'.uniqid(), 'Uji fondasi SAK EMKM', $date);
    }

    public function test_new_accounts_exist_with_the_right_type_and_side(): void
    {
        $accounts = Account::whereIn('account_code', ['1-1100', '2-1100', '4-3000', '6-1011', '6-1012'])->get()->keyBy('account_code');

        $this->assertCount(5, $accounts);
        $this->assertSame(['ASSET', 'DEBIT'], [$accounts['1-1100']->account_type, $accounts['1-1100']->normal_balance]);
        $this->assertSame(['LIABILITY', 'CREDIT'], [$accounts['2-1100']->account_type, $accounts['2-1100']->normal_balance]);
        $this->assertSame(['REVENUE', 'CREDIT'], [$accounts['4-3000']->account_type, $accounts['4-3000']->normal_balance]);
        $this->assertSame(['EXPENSE', 'DEBIT'], [$accounts['6-1011']->account_type, $accounts['6-1011']->normal_balance]);
        $this->assertSame(['EXPENSE', 'DEBIT'], [$accounts['6-1012']->account_type, $accounts['6-1012']->normal_balance]);
        $this->assertTrue($accounts->every(fn (Account $a) => $a->is_active));
    }

    public function test_new_permission_keys_are_owner_only_by_default(): void
    {
        $matrix = RolePermission::configMatrix();
        foreach (['KASIR', 'GUDANG'] as $role) {
            $this->assertFalse($matrix[$role]['fixed_assets']);
            $this->assertFalse($matrix[$role]['bank_reconciliation']);
        }

        $owner = $this->actingAsRole('OWNER');
        $this->assertTrue($owner->hasPermission('fixed_assets'));
        $this->assertTrue($owner->hasPermission('bank_reconciliation'));
    }

    public function test_manual_journal_rejects_fixed_asset_control_accounts(): void
    {
        foreach (['1-3000', '1-3999'] as $code) {
            $this->postJson('/api/v1/accounting/journals/manual', [
                'date' => '2019-03-01',
                'description' => 'Koreksi aset tetap',
                'items' => [
                    ['account_code' => $code, 'debit' => 100000, 'credit' => 0],
                    ['account_code' => '3-1000', 'debit' => 0, 'credit' => 100000],
                ],
            ])->assertStatus(422)->assertJsonValidationErrors('items.0.account_code');
        }
    }

    public function test_cash_flow_classifies_bank_interest_prepayments_and_accruals(): void
    {
        $this->postJournal('2019-03-05', [['1-1001', 10000, 0], ['4-3000', 0, 10000]]);
        $this->postJournal('2019-03-06', [['6-1012', 2500, 0], ['1-1001', 0, 2500]]);
        $this->postJournal('2019-03-07', [['1-1100', 60000, 0], ['1-1000', 0, 60000]]);
        $this->postJournal('2019-03-08', [['2-1100', 40000, 0], ['1-1000', 0, 40000]]);

        $report = app(CashFlowReport::class)->build('2019-03-01', '2019-03-31');

        $this->assertEquals(10000, $report['operating']['other']);
        $this->assertEquals(-102500, $report['operating']['expenses']);
        $this->assertEquals(0, $report['operating']['customers']);
        $this->assertTrue($report['is_reconciled']);
    }
}
