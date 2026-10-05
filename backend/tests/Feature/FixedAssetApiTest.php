<?php

namespace Tests\Feature;

use App\Models\AccountingPeriodClosing;
use App\Models\FixedAsset;
use App\Models\FixedAssetDepreciation;
use App\Models\JournalEntry;
use App\Services\Accounting\DepreciationService;
use App\Services\Accounting\LedgerBalances;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FixedAssetApiTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/accounting/fixed-assets';

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Mesin Spooring Hunter',
            'category' => 'PERALATAN_BENGKEL',
            'acquisition_date' => '2019-01-15',
            'acquisition_cost' => 12000000,
            'residual_value' => 0,
            'useful_life_months' => 48,
            'funding' => 'TUNAI',
        ], $overrides);
    }

    private function openingPayload(array $overrides = []): array
    {
        return $this->payload(array_merge([
            'name' => 'Mesin Balancing Lama',
            'acquisition_date' => '2017-06-01',
            'acquisition_cost' => 10000000,
            'residual_value' => 1000000,
            'useful_life_months' => 24,
            'funding' => 'OPENING',
            'depreciation_start' => '2019-02',
            'opening_accumulated_depreciation' => 3000000,
        ], $overrides));
    }

    private function line(array $journal, string $code): array
    {
        return collect($journal['lines'])->firstWhere('account_code', $code);
    }

    public function test_cash_purchase_posts_the_acquisition_journal(): void
    {
        $res = $this->postJson(self::URL, $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.asset.depreciation_start', '2019-01')
            ->assertJsonPath('data.asset.status', 'ACTIVE')
            ->assertJsonPath('data.asset.book_value', 12000000)
            ->assertJsonPath('data.asset.monthly_depreciation', 250000)
            ->assertJsonPath('data.journals.0.reference_type', 'FIXED_ASSET_ACQUISITION')
            ->assertJsonPath('data.journals.0.entry_date', '2019-01-15');

        $this->assertStringStartsWith('AT-201901-', $res->json('data.asset.code'));
        $journal = $res->json('data.journals.0');
        $this->assertEquals(12000000, $this->line($journal, '1-3000')['debit']);
        $this->assertEquals(12000000, $this->line($journal, '1-1000')['credit']);
        $this->assertSame($journal['entry_number'], $res->json('data.asset.journal_entry_number'));
    }

    public function test_transfer_purchase_credits_the_bank(): void
    {
        $journal = $this->postJson(self::URL, $this->payload(['funding' => 'TRANSFER']))->assertCreated()->json('data.journals.0');

        $this->assertEquals(12000000, $this->line($journal, '1-1001')['credit']);
    }

    public function test_opening_asset_posts_no_journal_and_keeps_prior_accumulation(): void
    {
        $this->postJson(self::URL, $this->openingPayload())
            ->assertCreated()
            ->assertJsonPath('data.journals', [])
            ->assertJsonPath('data.asset.journal_entry_number', null)
            ->assertJsonPath('data.asset.depreciation_start', '2019-02')
            ->assertJsonPath('data.asset.accumulated_depreciation', 3000000)
            ->assertJsonPath('data.asset.book_value', 7000000)
            ->assertJsonPath('data.asset.monthly_depreciation', 250000);
    }

    public function test_invalid_assets_are_rejected(): void
    {
        $this->postJson(self::URL, $this->openingPayload(['opening_accumulated_depreciation' => 9500000]))
            ->assertStatus(422)->assertJsonValidationErrors('residual_value');
        $this->postJson(self::URL, $this->payload(['depreciation_start' => '2019-01']))
            ->assertStatus(422)->assertJsonValidationErrors('depreciation_start');
        $this->postJson(self::URL, $this->openingPayload(['depreciation_start' => null]))
            ->assertStatus(422)->assertJsonValidationErrors('depreciation_start');
        $this->postJson(self::URL, $this->openingPayload(['depreciation_start' => '2017-05']))
            ->assertStatus(422)->assertJsonValidationErrors('depreciation_start');
        $this->postJson(self::URL, $this->payload(['acquisition_date' => now()->addDay()->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors('acquisition_date');
        $this->postJson(self::URL, $this->payload(['category' => 'TANAH', 'useful_life_months' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors(['category', 'useful_life_months']);
        $this->postJson(self::URL, $this->payload(['name' => '', 'acquisition_cost' => 'abc']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name' => 'Nama aset wajib diisi.', 'acquisition_cost' => 'Harga perolehan harus berupa angka.']);
    }

    public function test_acquisition_in_a_closed_period_is_rejected(): void
    {
        AccountingPeriodClosing::create(['period' => '2019-01', 'end_date' => '2019-01-31', 'net_income' => 0, 'closed_at' => now()]);

        $this->postJson(self::URL, $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah ditutup'));
        $this->assertFalse(FixedAsset::where('name', 'Mesin Spooring Hunter')->where('acquisition_date', '2019-01-15')->exists());
    }

    public function test_void_mirrors_the_acquisition_once(): void
    {
        $created = $this->postJson(self::URL, $this->payload())->json('data');
        $id = $created['asset']['id'];

        $res = $this->postJson(self::URL."/{$id}/void", ['reason' => 'Salah input harga'])
            ->assertOk()
            ->assertJsonPath('data.asset.status', 'VOID')
            ->assertJsonPath('data.asset.void_reason', 'Salah input harga')
            ->assertJsonPath('data.journals.0.reference_type', 'FIXED_ASSET_VOID')
            ->assertJsonPath('data.journals.0.reversal_of', $created['journals'][0]['entry_number'])
            ->assertJsonPath('data.journals.0.entry_date', now()->toDateString());

        $journal = $res->json('data.journals.0');
        $this->assertEquals(12000000, $this->line($journal, '1-1000')['debit']);
        $this->assertEquals(12000000, $this->line($journal, '1-3000')['credit']);

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'lagi'])->assertStatus(422);
        $this->postJson(self::URL."/{$id}/void", [])
            ->assertStatus(422)->assertJsonValidationErrors(['reason' => 'Alasan pembatalan wajib diisi.']);
    }

    public function test_void_of_an_opening_asset_only_changes_its_status(): void
    {
        $id = $this->postJson(self::URL, $this->openingPayload())->json('data.asset.id');

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'Dobel'])
            ->assertOk()->assertJsonPath('data.asset.status', 'VOID')->assertJsonPath('data.journals', []);
    }

    public function test_capital_asset_books_its_net_value_to_capital_and_its_void_mirrors_it(): void
    {
        $before = $this->ledger();
        $diff = $this->getJson(self::URL)->json('data.summary');
        $created = $this->postJson(self::URL, $this->openingPayload(['funding' => 'MODAL']))
            ->assertCreated()
            ->assertJsonPath('data.asset.depreciation_start', '2019-02')
            ->assertJsonPath('data.journals.0.reference_type', 'FIXED_ASSET_ACQUISITION')
            ->json('data');

        $journal = $created['journals'][0];
        $this->assertSame($journal['entry_number'], $created['asset']['journal_entry_number']);
        $this->assertEquals(10000000, $this->line($journal, '1-3000')['debit']);
        $this->assertEquals(3000000, $this->line($journal, '1-3999')['credit']);
        $this->assertEquals(7000000, $this->line($journal, '3-1000')['credit']);
        $this->assertNull(collect($journal['lines'])->first(fn ($l) => in_array($l['account_code'], ['1-1000', '1-1001'], true)));
        $this->assertEquals([10000000, -3000000], [
            round($this->ledger()['1-3000'] - $before['1-3000'], 2),
            round($this->ledger()['1-3999'] - $before['1-3999'], 2),
        ]);
        $summary = $this->getJson(self::URL)->json('data.summary');
        $this->assertEquals([$diff['difference_cost'], $diff['difference_accumulated']], [$summary['difference_cost'], $summary['difference_accumulated']]);

        $this->postJson(self::URL."/{$created['asset']['id']}/void", ['reason' => 'Salah input', 'correct_ledger' => true])->assertStatus(422);
        $this->postJson(self::URL."/{$created['asset']['id']}/void", ['reason' => 'Salah input'])
            ->assertOk()->assertJsonPath('data.journals.0.reversal_of', $journal['entry_number']);
        $this->assertEquals([$before['1-3000'], $before['1-3999']], [$this->ledger()['1-3000'], $this->ledger()['1-3999']]);
    }

    public function test_voiding_an_opening_asset_can_correct_the_ledger(): void
    {
        $before = $this->ledger();
        $id = $this->postJson(self::URL, $this->openingPayload())->json('data.asset.id');
        $diff = $this->getJson(self::URL)->json('data.summary');

        $journal = $this->postJson(self::URL."/{$id}/void", ['reason' => 'Saldo awal terlalu besar', 'correct_ledger' => true])
            ->assertOk()
            ->assertJsonPath('data.journals.0.reference_type', 'FIXED_ASSET_VOID')
            ->assertJsonPath('data.journals.0.entry_date', now()->toDateString())
            ->json('data.journals.0');
        $this->assertEquals(7000000, $this->line($journal, '3-1000')['debit']);
        $this->assertEquals(3000000, $this->line($journal, '1-3999')['debit']);
        $this->assertEquals(10000000, $this->line($journal, '1-3000')['credit']);

        // Register dan buku besar turun bersama, jadi selisih register − buku besar tidak berubah.
        $summary = $this->getJson(self::URL)->json('data.summary');
        $this->assertEquals([$diff['difference_cost'], $diff['difference_accumulated']], [$summary['difference_cost'], $summary['difference_accumulated']]);
        $this->assertEquals([round($before['1-3000'] - 10000000, 2), round($before['1-3999'] + 3000000, 2)], [$this->ledger()['1-3000'], $this->ledger()['1-3999']]);
    }

    /** Saldo 1-3000, 1-3999 dan 6-1011 dari sisi debit, seluruh waktu atau dalam satu bulan. */
    private function ledger(?string $period = null): array
    {
        $range = $period === null ? [null, null] : [$period.'-01', DepreciationService::endOf($period)];
        $balances = LedgerBalances::forRange(...$range)->keyBy(fn ($b) => $b->account->account_code);

        return array_map(fn (string $code) => $balances[$code]->signed('DEBIT'), ['1-3000' => '1-3000', '1-3999' => '1-3999', '6-1011' => '6-1011']);
    }

    private function calkFixedAssets(string $period): array
    {
        return $this->getJson('/api/v1/reports/calk?period='.$period)->assertOk()->json('data.notes.fixed_assets');
    }

    private function calkDifferences(array $note): array
    {
        return [round($note['total_cost'] - $note['ledger_cost'], 2), round($note['total_accumulated'] - $note['ledger_accumulated'], 2)];
    }

    /** @return list<string> $months bulan berurutan mulai $from (YYYY-MM) */
    private static function periods(string $from, int $months): array
    {
        return array_map(fn (int $i) => Carbon::parse($from.'-01')->addMonthsNoOverflow($i)->format('Y-m'), range(0, $months - 1));
    }

    /** Jalankan penyusutan bulan demi bulan; mengembalikan daftar periode. */
    private function depreciateThrough(string $from, int $months): array
    {
        $periods = self::periods($from, $months);
        foreach ($periods as $period) {
            $this->postJson(self::URL.'/depreciation', ['period' => $period])->assertCreated();
        }

        return $periods;
    }

    /** Tunai (S 1-1000) dan riwayat 25 bulan: catatan baris tidak memuat daftar periode, jadi tidak melewati varchar(255). */
    public function test_void_of_a_depreciated_asset_reverses_each_month_in_its_own_month(): void
    {
        $months = 25;
        $before = $this->ledger();
        $beforeMonth = collect(self::periods('2019-01', $months))->mapWithKeys(fn ($p) => [$p => $this->ledger($p)['6-1011']]);
        $register = $this->getJson(self::URL)->json('data.summary');
        $calkPast = $this->calkDifferences($this->calkFixedAssets('2019-02'));
        $calkNow = $this->calkDifferences($this->calkFixedAssets(now()->format('Y-m')));

        $created = $this->postJson(self::URL, $this->payload())->assertCreated()->json('data');
        $id = $created['asset']['id'];
        $code = $created['asset']['code'];
        $periods = $this->depreciateThrough('2019-01', $months);

        $journals = $this->postJson(self::URL."/{$id}/void", ['reason' => 'Salah input harga'])
            ->assertOk()
            ->assertJsonPath('data.asset.status', 'VOID')
            ->json('data.journals');

        // 25 pembalikan berurutan bulan (tanggal & nomor JRN naik), lalu cermin perolehan bertanggal hari ini.
        $this->assertCount($months + 1, $journals);
        $mirror = array_pop($journals);
        $this->assertSame($created['journals'][0]['entry_number'], $mirror['reversal_of']);
        $this->assertSame(now()->toDateString(), $mirror['entry_date']);
        foreach ($journals as $i => $journal) {
            $this->assertSame('FIXED_ASSET_VOID', $journal['reference_type']);
            $this->assertSame($code, $journal['reference_id']);
            $this->assertSame(DepreciationService::endOf($periods[$i]), $journal['entry_date']);
            $this->assertCount(2, $journal['lines']);
            $this->assertEquals(250000, $this->line($journal, '1-3999')['debit']);
            $this->assertEquals(250000, $this->line($journal, '6-1011')['credit']);
            if ($i > 0) {
                $this->assertGreaterThan($journals[$i - 1]['id'], $journal['id']);
            }
        }

        $this->assertEquals($before, $this->ledger());
        foreach ($periods as $period) {
            $this->assertEquals($beforeMonth[$period], $this->ledger($period)['6-1011'], "6-1011 {$period}");
        }
        $after = $this->getJson(self::URL)->json('data.summary');
        $this->assertEquals($register['difference_cost'], $after['difference_cost']);
        $this->assertEquals($register['difference_accumulated'], $after['difference_accumulated']);
        $this->assertSame([], array_filter(
            app(DepreciationService::class)->pendingLines(now()->format('Y-m')),
            fn (array $l) => $l['asset']->id === $id,
        ));

        // CALK bulan lampau (sebelum hari pembatalan): aset masih tercatat, akumulasinya hanya saldo awal (0); cocok dengan 1-3999.
        $february = $this->calkFixedAssets('2019-02');
        $this->assertEquals(0, collect($february['assets'])->firstWhere('code', $code)['accumulated']);
        $this->assertEquals($calkPast, $this->calkDifferences($february));
        $now = $this->calkFixedAssets(now()->format('Y-m'));
        $this->assertNotContains($code, array_column($now['assets'], 'code'));
        $this->assertEquals($calkNow, $this->calkDifferences($now));

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'lagi'])->assertStatus(422);
    }

    public function test_void_of_a_depreciated_opening_asset_reverses_only_system_depreciation(): void
    {
        $calkPast = $this->calkDifferences($this->calkFixedAssets('2019-03'));
        $created = $this->postJson(self::URL, $this->openingPayload())->assertCreated()->json('data');
        $this->depreciateThrough('2019-02', 2);

        $journals = $this->postJson(self::URL."/{$created['asset']['id']}/void", ['reason' => 'Dobel'])->assertOk()->json('data.journals');

        $this->assertSame(['2019-02-28', '2019-03-31'], array_column($journals, 'entry_date'));
        foreach ($journals as $journal) {
            $this->assertCount(2, $journal['lines']);
            $this->assertEquals(250000, $this->line($journal, '1-3999')['debit']);
        }
        $note = $this->calkFixedAssets('2019-03');
        $this->assertEquals(3000000, collect($note['assets'])->firstWhere('code', $created['asset']['code'])['accumulated']);
        // Saldo awal aset (biaya & akumulasi lama) tidak lewat jurnal sistem, jadi selisih CALK bergeser tepat sebesar itu.
        $this->assertEquals([round($calkPast[0] + 10000000, 2), round($calkPast[1] + 3000000, 2)], $this->calkDifferences($note));
    }

    public function test_void_is_refused_when_a_depreciation_month_is_closed(): void
    {
        $created = $this->postJson(self::URL, $this->payload())->json('data');
        $id = $created['asset']['id'];
        $this->postJson(self::URL.'/depreciation', ['period' => '2019-01'])->assertCreated();
        AccountingPeriodClosing::create(['period' => '2019-01', 'end_date' => '2019-01-31', 'net_income' => 0, 'closed_at' => now()]);

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'x'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'periode 2019-01 yang sudah ditutup'));
        $this->assertSame(0, JournalEntry::where('reference_type', 'FIXED_ASSET_VOID')->where('reference_id', $created['asset']['code'])->count());
        $this->assertSame('ACTIVE', FixedAsset::findOrFail($id)->status);
    }

    /**
     * Penyusutan yang commit di koneksi lain setelah snapshot REPEATABLE READ void terbentuk (bacaan funding tanpa
     * kunci) harus tetap terlihat oleh bacaan di bawah kunci, sehingga ikut dibalik. Aset & baris penyusutan di-commit lewat
     * koneksi kedua (tanpa jurnal: cek FK dimatikan di sesi itu saja) dan dihapus sendiri setelah rollback test.
     */
    public function test_void_sees_a_depreciation_committed_after_its_snapshot(): void
    {
        config(['database.connections.side' => config('database.connections.'.config('database.default'))]);
        $asset = FixedAsset::on('side')->create([
            'code' => 'AT-TEST-'.uniqid(), 'name' => 'Aset Snapshot', 'category' => 'PERALATAN_BENGKEL',
            'acquisition_date' => '2019-01-01', 'acquisition_cost' => 0, 'residual_value' => 0, 'useful_life_months' => 12,
            'depreciation_start' => '2019-01', 'opening_accumulated_depreciation' => 0, 'funding' => 'TRANSFER', 'status' => 'ACTIVE',
        ]);
        $this->beforeApplicationDestroyed(function () use ($asset) {
            FixedAsset::on('side')->whereKey($asset->id)->delete(); // baris penyusutan ikut terhapus (cascade)
            DB::purge('side');
        });

        DB::select('select count(*) from fixed_asset_depreciations'); // snapshot transaksi test ditetapkan di sini
        $side = DB::connection('side');
        $side->statement('SET FOREIGN_KEY_CHECKS = 0');
        FixedAssetDepreciation::on('side')->create(['fixed_asset_id' => $asset->id, 'period' => '2019-01', 'amount' => 100, 'journal_entry_id' => 0]);
        $side->statement('SET FOREIGN_KEY_CHECKS = 1');

        $res = $this->postJson(self::URL."/{$asset->id}/void", ['reason' => 'x'])->assertOk();
        $this->assertEquals(100, $this->line($res->json('data.journals.0'), '1-3999')['debit']);
    }

    public function test_index_lists_the_register_next_to_the_ledger(): void
    {
        $before = $this->getJson(self::URL)->assertOk()->json('data.summary');
        $this->postJson(self::URL, $this->payload())->assertCreated();

        $res = $this->getJson(self::URL)->assertOk();
        $after = $res->json('data.summary');

        $this->assertEquals(12000000, round($after['total_cost'] - $before['total_cost'], 2));
        $this->assertEquals(12000000, round($after['ledger_cost'] - $before['ledger_cost'], 2));
        $this->assertEquals($before['difference_cost'], $after['difference_cost']);
        $this->assertContains('Mesin Spooring Hunter', array_column($res->json('data.assets'), 'name'));
    }

    public function test_roles_without_fixed_assets_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::URL)->assertForbidden();
        $this->postJson(self::URL, $this->payload())->assertForbidden();
        $this->postJson(self::URL.'/1/void', ['reason' => 'x'])->assertForbidden();
    }
}
