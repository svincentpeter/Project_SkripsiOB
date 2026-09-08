<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\BrandAlias;
use App\Services\Inventory\StockExcelImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StockExcelImportServiceTest extends TestCase
{
    private array $staging;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staging = app(StockExcelImportService::class)->processExcelToStaging(
            base_path('tests/Fixtures/stock-fixture.xlsx'),
            storage_path('app/stock_migration/test-staging.json')
        );
    }

    private function product(string $name, ?string $size = null): array
    {
        foreach ($this->staging['products'] as $p) {
            if ($p['product_name'] === $name && ($size === null || (string) $p['product_size'] === $size)) {
                return $p;
            }
        }
        $this->fail("Produk {$name} tidak ditemukan di staging");
    }

    public function test_invarian_tidak_ada_baris_hilang(): void
    {
        $m = $this->staging['meta'];

        $this->assertSame(
            $m['rows_read'],
            $m['rows_product'] + $m['rows_child'] + $m['rows_note'] + $m['rows_unresolved']
        );
        $this->assertSame(13, $m['rows_read']);
    }

    public function test_baris_anak_tanpa_nama_mewarisi_induk(): void
    {
        $techno = $this->product('Bs Techno');

        $this->assertCount(2, $techno['batches']);
        $this->assertSame(8, $techno['total_stock']); // 3 + 5 dari kolom Sisa
        $this->assertSame(537550, $techno['batches'][0]['batch_cost']);
        $this->assertSame(600000, $techno['batches'][1]['batch_cost']);
    }

    public function test_kuantitas_dari_kolom_sisa_bukan_stock(): void
    {
        $delium = $this->product('Delium Power Saver');

        $this->assertSame(6, $delium['total_stock']);
        $this->assertSame(12, $delium['opening_qty']);
        $this->assertSame(88, $this->staging['meta']['total_stock_qty']);
    }

    public function test_dua_baris_induk_identik_digabung(): void
    {
        $duravis = $this->product('Bs Duravis');

        $this->assertCount(2, $duravis['batches']);
        $this->assertSame(7, $duravis['total_stock']);
    }

    public function test_penanda_stok_lama_dari_font_merah_dan_at(): void
    {
        $techno = $this->product('Bs Techno');
        $this->assertTrue($techno['is_old_stock']);
        $this->assertSame(590000, $techno['reference_price']);

        $turanza = $this->product('Bs Turanza');
        $this->assertTrue($turanza['is_old_stock']); // merah tanpa @
        $this->assertNull($turanza['reference_price']);
        $this->assertSame(2018, $turanza['product_year']);

        $this->assertFalse($this->product('Delium Power Saver')['is_old_stock']);
    }

    public function test_merek_diselesaikan_per_baris(): void
    {
        $this->assertSame('Hankook', $this->product('HANKOOK')['brand_name']);
        $this->assertSame('Delium', $this->product('Delium Power Saver')['brand_name']);
        $this->assertSame('Swallow', $this->product('Ban Dalam Swallow (Jeep)')['brand_name']);
    }

    public function test_merek_tak_dikenal_masuk_keranjang_bukan_dibuang(): void
    {
        $this->assertCount(1, $this->staging['unresolved']);
        $this->assertSame('Zeetex Su1000', $this->staging['unresolved'][0]['name']);
        $this->assertSame('brand_tidak_dikenal', $this->staging['unresolved'][0]['reason']);
    }

    public function test_baris_catatan_dikumpulkan(): void
    {
        $texts = array_column($this->staging['notes'], 'text');

        $this->assertCount(2, $texts);
        $this->assertContains('Ambil dari Masa Sempurna :', $texts);
    }

    public function test_kategori_dari_sheet(): void
    {
        $this->assertSame(3, $this->product('Sliwer R 16')['category_id']);
        $this->assertSame(1, $this->product('Bs Duravis')['category_id']);
    }

    public function test_rata_rata_modal_tertimbang(): void
    {
        // (537550*3 + 600000*5) / 8 = 576581,25 -> 576581
        $this->assertSame(576581, $this->product('Bs Techno')['avg_cost']);
    }
}
