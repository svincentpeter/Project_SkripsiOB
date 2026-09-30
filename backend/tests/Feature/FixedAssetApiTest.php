<?php

namespace Tests\Feature;

use App\Models\AccountingPeriodClosing;
use App\Models\FixedAsset;
use App\Models\FixedAssetDepreciation;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
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

    public function test_void_is_refused_once_depreciation_was_posted(): void
    {
        $id = $this->postJson(self::URL, $this->payload())->json('data.asset.id');
        $entry = (new JournalDraft())->debit('6-1011', 250000, 'uji')->credit('1-3999', 250000, 'uji')
            ->post(app(AccountingEngine::class), 'TEST', 'FA-'.uniqid(), 'Uji penyusutan', '2019-01-31');
        FixedAssetDepreciation::create(['fixed_asset_id' => $id, 'period' => '2019-01', 'amount' => 250000, 'journal_entry_id' => $entry->id]);

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'x'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah disusutkan'));
        $this->assertSame(0, JournalEntry::where('reference_type', 'FIXED_ASSET_VOID')->count());
    }

    /**
     * Penyusutan yang commit di koneksi lain setelah snapshot REPEATABLE READ void terbentuk (bacaan funding tanpa
     * kunci) harus tetap terlihat oleh cek di bawah kunci. Aset & baris penyusutan di-commit lewat koneksi kedua
     * (nilai 0, tanpa jurnal: cek FK dimatikan di sesi itu saja) dan dihapus sendiri setelah rollback test.
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
        FixedAssetDepreciation::on('side')->create(['fixed_asset_id' => $asset->id, 'period' => '2019-01', 'amount' => 0, 'journal_entry_id' => 0]);
        $side->statement('SET FOREIGN_KEY_CHECKS = 1');

        $this->postJson(self::URL."/{$asset->id}/void", ['reason' => 'x'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah disusutkan'));
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
