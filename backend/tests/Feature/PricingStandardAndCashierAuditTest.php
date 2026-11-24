<?php

namespace Tests\Feature;

use App\Models\ProductPriceAudit;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class PricingStandardAndCashierAuditTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    public function test_product_reference_hpp_uses_highest_active_batch_and_computes_15_percent_floor(): void
    {
        // Batch 1 @800rb, Batch 2 @1jt -> patokan HPP = 1.000.000, harga minimal (+15%) = 1.150.000
        $product = $this->makeProduct(1300000, [
            [4, 800000, '2026-08-01'],
            [4, 1000000, '2026-09-01'],
        ]);

        $this->assertEquals(1000000.0, $product->referenceHpp());
        $this->assertEquals(1150000.0, $product->minimumSellingPrice());

        $res = $this->getJson("/api/v1/products/{$product->id}")->assertOk();
        $res->assertJsonPath('data.reference_hpp', 1000000)
            ->assertJsonPath('data.min_selling_price', 1150000);
    }

    public function test_cashier_can_determine_price_when_catalog_price_is_zero_and_saves_to_catalog_and_audit(): void
    {
        // Produk lupa diisi harga jualnya oleh Owner (Rp 0), HPP batch = Rp 800.000 (min +15% = Rp 920.000)
        $product = $this->makeProduct(0, [[6, 800000, '2026-08-01']]);
        $this->actingAsRole('KASIR');

        // 1. Di bawah +15% (Rp 900.000 < Rp 920.000) ditolak
        $this->checkout([
            'items' => [[
                'type' => 'PRODUCT',
                'product_id' => $product->id,
                'name' => $product->product_name,
                'quantity' => 1,
                'unit_price' => 900000,
                'override_reason' => 'Harga katalog belum diisi Owner',
            ]],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 900000]],
        ])->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'minimal 15%'));

        // 2. Tanpa alasan penentuan harga ditolak
        $this->checkout([
            'items' => [[
                'type' => 'PRODUCT',
                'product_id' => $product->id,
                'name' => $product->product_name,
                'quantity' => 1,
                'unit_price' => 1000000,
            ]],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000]],
        ])->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'wajib mengisi alasan'));

        // 3. Memenuhi +15% (Rp 1.000.000 = +25% dari HPP) + alasan lengkap -> sukses, update katalog & catat audit
        $res = $this->checkout([
            'items' => [[
                'type' => 'PRODUCT',
                'product_id' => $product->id,
                'name' => $product->product_name,
                'quantity' => 2,
                'unit_price' => 1000000,
                'override_reason' => 'Harga katalog belum diisi Owner (Owner sedang sibuk)',
            ]],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 2000000]],
        ])->assertCreated();

        $res->assertJsonPath('data.items.0.catalog_price', 0)
            ->assertJsonPath('data.items.0.unit_price', 1000000)
            ->assertJsonPath('data.items.0.reference_hpp', 800000)
            ->assertJsonPath('data.items.0.price_override_type', 'INITIAL_CASHIER_PRICE')
            ->assertJsonPath('data.items.0.price_override_reason', 'Harga katalog belum diisi Owner (Owner sedang sibuk)');

        // Harga katalog terisi sementara agar transaksi berikutnya tidak Rp 0
        $this->assertEquals(1000000.0, (float) $product->fresh()->product_price);

        // Tercatat di Audit Log & Notifikasi Owner
        $audit = ProductPriceAudit::where('product_id', $product->id)
            ->where('sale_id', $res->json('data.id'))
            ->firstOrFail();

        $this->assertSame('pos_cashier_initial', $audit->change_source);
        $this->assertSame('CATALOG_AND_NOTA', $audit->applies_to);
        $this->assertSame('KASIR', $audit->actor_role);
        $this->assertEquals(0.0, (float) $audit->old_price);
        $this->assertEquals(1000000.0, (float) $audit->new_price);
        $this->assertEquals(800000.0, (float) $audit->reference_hpp);
        $this->assertEquals(25.0, (float) $audit->markup_percent);
        $this->assertFalse($audit->is_read_by_owner);
        $this->assertFalse($audit->is_reviewed_by_owner);
    }

    public function test_cashier_can_raise_price_on_nota_for_customer_reimbursement_without_changing_catalog(): void
    {
        // Ban Jeep harga katalog Rp 1.500.000 (HPP Rp 1.000.000, margin +50% oleh Owner)
        $product = $this->makeProduct(1500000, [[5, 1000000, '2026-08-01']]);
        $this->actingAsRole('KASIR');

        // 1. Kasir tidak boleh menurunkan harga di bawah harga katalog yang sudah ditetapkan Owner
        $this->checkout([
            'items' => [[
                'type' => 'PRODUCT',
                'product_id' => $product->id,
                'name' => $product->product_name,
                'quantity' => 1,
                'unit_price' => 1400000,
                'override_reason' => 'Diskon teman',
            ]],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1400000]],
        ])->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'tidak diizinkan menurunkan'));

        // 2. Kasir tidak boleh mengakali lewat diskon baris di bawah harga katalog
        $this->checkout([
            'items' => [[
                'type' => 'PRODUCT',
                'product_id' => $product->id,
                'name' => $product->product_name,
                'quantity' => 1,
                'unit_price' => 1500000,
                'discount_per_item' => 100000,
            ]],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1400000]],
        ])->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'tidak diizinkan menurunkan'));

        // 3. Pembeli meminta menaikkan harga di nota menjadi Rp 1.750.000 untuk reimburse ke atasannya
        $res = $this->checkout([
            'items' => [[
                'type' => 'PRODUCT',
                'product_id' => $product->id,
                'name' => $product->product_name,
                'quantity' => 2,
                'unit_price' => 1750000,
                'override_reason' => 'Permintaan pembeli untuk reimburse ke atasan kantor',
            ]],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 3500000]],
        ])->assertCreated();

        $res->assertJsonPath('data.items.0.catalog_price', 1500000)
            ->assertJsonPath('data.items.0.unit_price', 1750000)
            ->assertJsonPath('data.items.0.price_override_type', 'CASHIER_NOTA_MARKUP')
            ->assertJsonPath('data.items.0.price_override_reason', 'Permintaan pembeli untuk reimburse ke atasan kantor');

        // Harga master katalog tetap Rp 1.500.000 (tidak berubah karena hanya untuk nota reimburse)
        $this->assertEquals(1500000.0, (float) $product->fresh()->product_price);

        // Tercatat di Audit Log & Notifikasi Owner sebagai NOTA_ONLY
        $audit = ProductPriceAudit::where('product_id', $product->id)
            ->where('sale_id', $res->json('data.id'))
            ->firstOrFail();

        $this->assertSame('pos_cashier_override', $audit->change_source);
        $this->assertSame('NOTA_ONLY', $audit->applies_to);
        $this->assertEquals(1500000.0, (float) $audit->old_price);
        $this->assertEquals(1750000.0, (float) $audit->new_price);
        $this->assertEquals(75.0, (float) $audit->markup_percent);
        $this->assertFalse($audit->is_reviewed_by_owner);
    }

    public function test_owner_can_review_price_audit_and_adjust_catalog_price(): void
    {
        $product = $this->makeProduct(0, [[4, 1000000, '2026-08-01']]);
        $this->actingAsRole('KASIR');

        $this->checkout([
            'items' => [[
                'type' => 'PRODUCT',
                'product_id' => $product->id,
                'name' => $product->product_name,
                'quantity' => 1,
                'unit_price' => 1150000,
                'override_reason' => 'Harga katalog kosong, Owner sedang sibuk',
            ]],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1150000]],
        ])->assertCreated();

        $audit = ProductPriceAudit::where('product_id', $product->id)->firstOrFail();

        // Owner melihat daftar audit log & notifikasi
        $this->actingAsRole('OWNER');
        $list = $this->getJson('/api/v1/price-audits?actor_role=KASIR&unreviewed_only=1')->assertOk();
        $this->assertGreaterThanOrEqual(1, $list->json('data.summary.unreviewed_owner_count'));

        // Owner meninjau dan menyesuaikan harga katalog ke margin ban Jeep (+35% = Rp 1.350.000)
        $this->postJson("/api/v1/price-audits/{$audit->id}/review", [
            'review_notes' => 'Disetujui, harga katalog dinaikkan ke margin ban Jeep +35%',
            'new_catalog_price' => 1350000,
        ])->assertOk()
            ->assertJsonPath('data.is_reviewed_by_owner', true)
            ->assertJsonPath('data.current_catalog_price', 1350000);

        $this->assertEquals(1350000.0, (float) $product->fresh()->product_price);
    }

    public function test_master_product_and_restock_enforce_15_percent_floor_and_warn_on_batch_cost_increase(): void
    {
        $this->actingAsRole('OWNER');

        // 1. Buat produk baru dengan harga jual di bawah HPP + 15% (HPP 1jt, harga 1,1jt < 1,15jt) -> ditolak
        $this->postJson('/api/v1/products', [
            'product_name' => 'Ban Jeep Savero '.uniqid(),
            'brand' => 'GTRadial',
            'product_cost' => 1000000,
            'product_price' => 1100000,
        ])->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, '+15%'));

        // 2. Restock Batch 2 dengan HPP naik (Batch 1 @600rb, harga jual 750rb; Batch 2 masuk @700rb -> min +15% = 805rb)
        $product = $this->makeProduct(750000, [[5, 600000, '2026-08-01']]);

        $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $product->id,
            'quantity' => 5,
            'batch_cost' => 700000,
            'source_name' => 'PT Supplier Pihak Kedua',
            'payment_method' => 'TEMPO',
        ])->assertCreated();

        // Otomatis membuat notifikasi peringatan margin untuk Owner karena harga lama (750rb) < 700rb × 1,15 (805rb)
        $warning = ProductPriceAudit::where('product_id', $product->id)
            ->where('change_source', 'goods_receipt_margin_warning')
            ->first();
        $this->assertNotNull($warning);
        $this->assertFalse($warning->is_reviewed_by_owner);
    }

    public function test_editing_product_keeps_product_cost_aligned_with_active_fifo_batches(): void
    {
        $product = $this->makeProduct(1300000, [[4, 999000, '2026-09-01']]);
        $this->actingAsRole('OWNER');

        // Saat stok batch FIFO aktif masih ada, edit master tidak boleh membuat product_cost melenceng menjadi 20.000
        $res = $this->putJson("/api/v1/products/{$product->id}", [
            'product_name' => $product->product_name,
            'brand' => $product->brand,
            'product_cost' => 20000,
            'product_price' => 1200000,
        ])->assertOk();

        $res->assertJsonPath('data.reference_hpp', 999000);
        $this->assertEquals(999000.0, (float) $product->fresh()->product_cost);
    }
}
