<?php

namespace Tests\Feature;

use App\Models\FixedAsset;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\Accounting\PeriodClosingService;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DepreciationTest extends TestCase
{
    use DatabaseTransactions;

    private const ASSETS = '/api/v1/accounting/fixed-assets';
    private const RUN = '/api/v1/accounting/fixed-assets/depreciation';

    /** Aset dari saldo awal: tidak membukukan jurnal perolehan, sehingga bulan mana pun boleh ditutup. */
    private function openingAsset(array $overrides = []): int
    {
        return $this->postJson(self::ASSETS, array_merge([
            'name' => 'Kompresor Angin',
            'category' => 'PERALATAN_BENGKEL',
            'acquisition_date' => '2018-12-01',
            'acquisition_cost' => 1200000,
            'residual_value' => 0,
            'useful_life_months' => 12,
            'funding' => 'OPENING',
            'depreciation_start' => '2019-01',
            'opening_accumulated_depreciation' => 0,
        ], $overrides))->assertCreated()->json('data.asset.id');
    }

    private function runPeriod(string $period): TestResponse
    {
        return $this->postJson(self::RUN, ['period' => $period]);
    }

    private function accumulated(int $id): float
    {
        return FixedAsset::findOrFail($id)->accumulatedDepreciation();
    }

    public function test_run_posts_one_straight_line_journal_for_the_month(): void
    {
        $this->postJson(self::ASSETS, [
            'name' => 'Mesin Spooring Hunter',
            'category' => 'PERALATAN_BENGKEL',
            'acquisition_date' => '2019-01-10',
            'acquisition_cost' => 12000000,
            'useful_life_months' => 48,
            'funding' => 'TUNAI',
        ])->assertCreated();

        $res = $this->runPeriod('2019-01')
            ->assertCreated()
            ->assertJsonPath('data.journals.0.reference_type', 'DEPRECIATION')
            ->assertJsonPath('data.journals.0.reference_id', 'SUSUT-2019-01')
            ->assertJsonPath('data.journals.0.entry_date', '2019-01-31');

        $lines = collect($res->json('data.journals.0.lines'));
        $this->assertEquals(250000, $lines->where('account_code', '6-1011')->sum('debit'));
        $this->assertEquals(250000, $lines->firstWhere('account_code', '1-3999')['credit']);
    }

    public function test_second_run_of_the_same_month_posts_nothing(): void
    {
        $id = $this->openingAsset();
        $this->runPeriod('2019-01')->assertCreated();

        $this->runPeriod('2019-01')
            ->assertOk()
            ->assertJsonPath('data.journals', [])
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Tidak ada penyusutan'));

        $this->assertSame(1, JournalEntry::where('reference_type', 'DEPRECIATION')->where('reference_id', 'SUSUT-2019-01')->count());
        $this->assertEquals(100000, $this->accumulated($id));
    }

    public function test_an_open_previous_month_must_be_depreciated_first(): void
    {
        $this->openingAsset();

        $this->runPeriod('2019-02')
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, '2019-01'));
        $this->getJson(self::RUN.'?period=2019-02')
            ->assertOk()
            ->assertJsonPath('data.blocked_reason', fn ($r) => is_string($r) && str_contains($r, '2019-01'));
    }

    public function test_last_month_absorbs_rounding(): void
    {
        $id = $this->openingAsset(['acquisition_cost' => 1000, 'useful_life_months' => 3]);

        $amounts = [];
        foreach (['2019-01', '2019-02', '2019-03'] as $period) {
            $amounts[] = $this->runPeriod($period)->assertCreated()->json('data.journals.0.total_debit');
        }
        $this->runPeriod('2019-04')->assertOk()->assertJsonPath('data.journals', []);

        $this->assertEquals([333.33, 333.33, 333.34], $amounts);
        $this->assertEquals(1000, $this->accumulated($id));
    }

    public function test_opening_asset_depreciates_its_remaining_base(): void
    {
        $id = $this->openingAsset([
            'acquisition_cost' => 10000000,
            'residual_value' => 1000000,
            'opening_accumulated_depreciation' => 3000000,
            'useful_life_months' => 24,
            'depreciation_start' => '2019-02',
        ]);

        $this->runPeriod('2019-01')->assertOk()->assertJsonPath('data.journals', []);
        $this->runPeriod('2019-02')->assertCreated()->assertJsonPath('data.journals.0.total_debit', 250000);
        $this->assertEquals(3250000, $this->accumulated($id));
    }

    public function test_period_close_requires_the_months_depreciation(): void
    {
        $this->openingAsset();

        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Penyusutan aset tetap sampai 2019-01'));

        $this->runPeriod('2019-01')->assertCreated();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();
    }

    public function test_a_closed_month_cannot_be_depreciated(): void
    {
        $this->openingAsset();
        $this->runPeriod('2019-01')->assertCreated();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();

        $this->runPeriod('2019-01')
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah ditutup'));
        $this->getJson(self::RUN.'?period=2019-01')->assertOk()->assertJsonPath('data.is_locked', true);
    }

    public function test_months_already_locked_are_caught_up_in_the_first_open_month(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();
        $id = $this->openingAsset();

        $this->runPeriod('2019-02')->assertCreated()->assertJsonPath('data.journals.0.total_debit', 200000);
        $this->assertEquals(200000, $this->accumulated($id));
    }

    public function test_preview_lists_pending_amounts_and_posted_journals(): void
    {
        $this->openingAsset();

        $this->getJson(self::RUN.'?period=2019-01')
            ->assertOk()
            ->assertJsonPath('data.total', 100000)
            ->assertJsonPath('data.lines.0.amount', 100000)
            ->assertJsonPath('data.blocked_reason', null)
            ->assertJsonPath('data.posted', []);

        $this->runPeriod('2019-01')->assertCreated();
        $this->getJson(self::RUN.'?period=2019-01')
            ->assertOk()
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.posted.0.total', 100000);
    }

    public function test_voided_assets_are_not_depreciated(): void
    {
        $id = $this->openingAsset();
        $this->postJson(self::ASSETS."/{$id}/void", ['reason' => 'Dobel input'])->assertOk();

        $this->runPeriod('2019-01')->assertOk()->assertJsonPath('data.journals', []);
    }

    public function test_future_period_is_rejected(): void
    {
        $this->runPeriod(now()->addMonthNoOverflow()->format('Y-m'))->assertStatus(422);
        $this->runPeriod('2019-13')->assertStatus(422);
    }

    public function test_roles_without_fixed_assets_cannot_run_depreciation(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::RUN.'?period=2019-01')->assertForbidden();
        $this->runPeriod('2019-01')->assertForbidden();
    }

    public function test_reopening_a_month_caught_up_later_does_not_depreciate_it_again(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();
        $id = $this->openingAsset();
        $this->runPeriod('2019-02')->assertCreated()->assertJsonPath('data.journals.0.total_debit', 200000);
        $this->postJson('/api/v1/accounting/periods/2019-01/reopen', ['reason' => 'Koreksi'])->assertOk();

        $this->getJson(self::RUN.'?period=2019-01')->assertOk()->assertJsonPath('data.total', 0);
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();

        $this->assertSame(1, JournalEntry::where('reference_type', 'DEPRECIATION')->count());
        $this->assertEquals(200000, $this->accumulated($id));
    }

    public function test_fully_depreciated_asset_has_nothing_pending_after_its_useful_life(): void
    {
        $id = $this->openingAsset(['acquisition_cost' => 300000, 'useful_life_months' => 3]);
        foreach (['2019-01', '2019-02', '2019-03'] as $period) {
            $this->runPeriod($period)->assertCreated();
        }

        $this->getJson(self::RUN.'?period=2019-09')->assertOk()->assertJsonPath('data.total', 0)->assertJsonPath('data.lines', []);
        $this->runPeriod('2019-09')->assertOk()->assertJsonPath('data.journals', []);
        $this->assertEquals(300000, $this->accumulated($id));
    }

    /**
     * Snapshot REPEATABLE READ dibuat pada bacaan biasa pertama. Tutup buku harus sudah memegang kunci register
     * (X 1-3999) sebelum bacaan biasa pertamanya, agar saldo yang ditutup memuat penyusutan yang commit selama menunggu.
     * Transaksi pembungkus tes sudah punya snapshot sejak setUp, jadi yang diuji adalah urutan kuerinya.
     */
    public function test_period_close_takes_the_register_lock_before_its_first_plain_read(): void
    {
        $user = User::firstOrFail();
        $queries = [];
        DB::listen(function (QueryExecuted $q) use (&$queries) {
            $queries[] = $q;
        });

        app(PeriodClosingService::class)->close('2019-01', null, $user);

        $isRegisterLock = fn (QueryExecuted $q) => str_contains($q->sql, 'for update') && in_array('1-3999', $q->bindings, true);
        $isPlainRead = fn (QueryExecuted $q) => str_starts_with(strtolower($q->sql), 'select')
            && ! str_contains($q->sql, 'for update') && ! str_contains($q->sql, 'lock in share mode');
        $lockAt = collect($queries)->search($isRegisterLock);
        $firstPlainRead = collect($queries)->search($isPlainRead);

        $this->assertNotFalse($lockAt);
        $this->assertNotFalse($firstPlainRead);
        $this->assertLessThan($firstPlainRead, $lockAt);
    }
}
