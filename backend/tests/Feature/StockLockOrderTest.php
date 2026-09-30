<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Services\AccountingEngine;
use App\Services\Inventory\PurchaseReturnService;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Urutan kunci baris stok terhadap transaksi lain (koneksi kedua "side"). Tanpa DatabaseTransactions: koneksi kedua
 * harus melihat baris yang sudah di-commit, dan test opname butuh read view yang dibuat setelah fixture ter-commit.
 * Transaksi koneksi utama di-rollback sendiri; baris yang di-commit lewat side dihapus di tearDown. Setiap commit side
 * menjaga Σ nilai FIFO − saldo 1-2000 tetap (modal 0, atau batch + jurnal dalam satu commit), jadi test lain yang
 * berjalan bersamaan di DB test yang sama tidak melihat selisih.
 */
class StockLockOrderTest extends TestCase
{
    use CreatesPosFixtures;

    /** @var array<int, int> */
    private array $sideProducts = [];

    /** @var array<int, int> */
    private array $sideJournals = [];

    private int $lockTimeout = 50;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.connections.side' => config('database.connections.'.config('database.default'))]);
        $this->lockTimeout = (int) DB::selectOne('SELECT @@SESSION.innodb_lock_wait_timeout AS t')->t;
    }

    protected function tearDown(): void
    {
        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        DB::statement('SET SESSION innodb_lock_wait_timeout = '.$this->lockTimeout);
        $side = DB::connection('side');
        while ($side->transactionLevel() > 0) {
            $side->rollBack();
        }
        $side->transaction(function () use ($side) {
            $side->table('journal_items')->whereIn('journal_entry_id', $this->sideJournals)->delete();
            $side->table('journal_entries')->whereIn('id', $this->sideJournals)->delete();
            $side->table('product_batches')->whereIn('product_id', $this->sideProducts)->delete();
            $side->table('products')->whereIn('id', $this->sideProducts)->delete();
        });
        DB::purge('side');
        parent::tearDown();
    }

    /** Jalankan $fn di koneksi side sebagai koneksi default (model & engine ikut), lalu commit. */
    private function onSide(callable $fn): mixed
    {
        $previous = DB::getDefaultConnection();
        DB::setDefaultConnection('side');
        try {
            return DB::transaction($fn);
        } finally {
            DB::setDefaultConnection($previous);
        }
    }

    private function sideProduct(array $batches): Product
    {
        $product = $this->makeProduct(1000000, $batches);
        $this->sideProducts[] = $product->id;

        return $product;
    }

    private function sideJournal(string $debit, string $credit, float $amount): void
    {
        $this->sideJournals[] = (new JournalDraft())
            ->debit($debit, $amount, 'Fixture StockLockOrderTest')
            ->credit($credit, $amount, 'Fixture StockLockOrderTest')
            ->post(app(AccountingEngine::class), 'TEST_ALIGN', 'TEST-LOCK-ORDER', 'Fixture StockLockOrderTest')
            ->id;
    }

    /**
     * Retur/pembatalan GR hanya mengunci batch produk GR itu. Dulu filter purchase_id (tanpa indeks) memindai seluruh
     * tabel dengan kunci next-key, sehingga batch produk lain yang dikunci checkout membuatnya menunggu (dan deadlock).
     */
    public function test_purchase_return_and_cancel_do_not_lock_other_products_batches(): void
    {
        $other = $this->onSide(fn () => $this->sideProduct([[1, 0, '2026-08-01']]));
        $side = DB::connection('side');

        DB::beginTransaction();
        $product = $this->makeProduct(800000, [[0, 450000, '2026-08-01']]);
        $receive = fn () => $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $product->id, 'quantity' => 2, 'batch_cost' => 500000, 'purchase_date' => '2026-09-20',
            'source_name' => 'Toko Grosir', 'payment_method' => 'TUNAI',
        ])->assertCreated()->json('data.purchase.id');
        $returned = $receive();
        $cancelled = $receive();

        $side->beginTransaction();
        $side->table('product_batches')->where('product_id', $other->id)->lockForUpdate()->get();
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        $service = app(PurchaseReturnService::class);
        $user = auth()->user();
        $this->assertSame(1, $service->returnGoods($returned, 1, 'Ban cacat produksi', null, $user)['return']->quantity);
        $this->assertSame('BATAL', $service->cancel($cancelled, 'Salah input faktur', $user)['purchase']->status);
    }
}
