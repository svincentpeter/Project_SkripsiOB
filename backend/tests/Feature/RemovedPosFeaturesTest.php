<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Sale;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * DP/booking inden, BON (piutang) dan EDC dihapus dari POS: endpoint lamanya tidak ada lagi,
 * akunnya nonaktif, tetapi jurnal lama tetap tampil di laporan.
 */
class RemovedPosFeaturesTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    public static function removedEndpoints(): array
    {
        return [
            ['GET', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings/1/cancel'],
            ['GET', '/api/v1/receivables'],
            ['POST', '/api/v1/receivables/1/payments'],
            ['GET', '/api/v1/settings/edc'],
            ['POST', '/api/v1/settings/edc'],
            ['PUT', '/api/v1/settings/edc/1'],
            ['DELETE', '/api/v1/settings/edc/1'],
        ];
    }

    #[DataProvider('removedEndpoints')]
    public function test_removed_endpoint_returns_404(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertNotFound();
    }

    public function test_payment_options_only_list_bank_and_qris_providers(): void
    {
        $this->getJson('/api/v1/pos/payment-options')
            ->assertOk()
            ->assertJsonStructure(['data' => ['bank_providers', 'qris_providers']])
            ->assertJsonMissingPath('data.edc_settings');
    }

    public function test_dp_bon_and_surcharge_accounts_are_inactive_but_mdr_stays_active(): void
    {
        $active = Account::whereIn('account_code', ['1-1002', '2-1004', '4-2000', '6-1009'])
            ->pluck('is_active', 'account_code');

        $this->assertFalse((bool) $active['1-1002']);
        $this->assertFalse((bool) $active['2-1004']);
        $this->assertFalse((bool) $active['4-2000']);
        $this->assertTrue((bool) $active['6-1009']);
    }

    public function test_historic_journal_on_an_inactive_account_still_shows_in_reports(): void
    {
        $reports = app(FinancialReportService::class);
        $before = $reports->incomeStatement('2019-09-01', '2019-09-30');

        (new JournalDraft())
            ->debit('1-1001', 7000, 'uji surcharge historis')
            ->credit('4-2000', 7000, 'uji surcharge historis')
            ->post(app(AccountingEngine::class), 'TEST', 'RM-'.uniqid(), 'Surcharge EDC historis', '2019-09-10');

        $after = $reports->incomeStatement('2019-09-01', '2019-09-30');
        $this->assertEquals(7000, $this->revenueLine($after, '4-2000') - $this->revenueLine($before, '4-2000'));
        $this->assertTrue($reports->trialBalance('2019-09-30')['is_balanced']);
        $this->assertTrue($reports->balanceSheet('2019-09-30')['is_balanced']);
    }

    private function revenueLine(array $incomeStatement, string $code): float
    {
        foreach ($incomeStatement['revenue']['lines'] as $line) {
            if ($line['code'] === $code) {
                return $line['amount'];
            }
        }

        return 0.0;
    }

    public function test_legacy_bon_with_settlements_and_dp_sales_cannot_be_voided(): void
    {
        $product = $this->makeProduct(1000000, [[5, 600000, '2026-08-01']]);
        $sale = fn () => $this->checkout([
            'items' => [$this->productLine($product, 1)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000]],
        ])->assertCreated()->json('data.id');

        // Riwayat sebelum 2026-09-30: nota BON yang sudah menerima pelunasan, dan nota yang memakai DP booking.
        $bon = $sale();
        DB::table('receivable_payments')->insert([
            'sale_id' => $bon, 'payment_date' => now()->toDateString(), 'amount' => 400000, 'account_code' => '1-1000',
            'operator_name' => 'Uji', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->postJson("/api/v1/pos/transactions/{$bon}/void", ['reason' => 'Salah input'])
            ->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'pelunasan'));

        $dp = $sale();
        Sale::whereKey($dp)->update(['dp_applied' => 200000]);
        $this->postJson("/api/v1/pos/transactions/{$dp}/void", ['reason' => 'Salah input'])
            ->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'uang muka'));

        $this->postJson('/api/v1/pos/transactions/'.$sale().'/void', ['reason' => 'Salah input'])->assertOk();
    }
}
