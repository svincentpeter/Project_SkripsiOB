<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\DocumentNumber;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Stock opname fisik: kekurangan dipotong dari batch FIFO tertua, kelebihan menjadi batch baru
 * berbiaya batch terakhir. Selisih nilai dijurnal ke 5-2000 Selisih Persediaan.
 */
class StockOpnameService
{
    public function __construct(private readonly InventoryValueJournal $valueJournal)
    {
    }

    /**
     * @param  array<int, array{product_id: int, physical_qty: int}>  $items
     * @return array{reference: string, adjustments: array<int, array<string, mixed>>, journal: ?\App\Models\JournalEntry}
     */
    public function adjust(array $items, ?string $notes, ?User $user): array
    {
        return DB::transaction(function () use ($items, $notes, $user) {
            // Urutan kunci sama dengan checkout, retur dan void: semua produk urut id dulu, baru nomor dokumen dan batch.
            $ids = collect($items)->map(fn ($item) => (int) $item['product_id'])->unique()->sort()->values();
            $products = Product::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $missing = $ids->diff($products->keys());
            if ($missing->isNotEmpty()) {
                throw (new ModelNotFoundException())->setModel(Product::class, $missing->all());
            }
            $reference = DocumentNumber::next(StockMovement::class, 'reference_id', 'OPN');

            $out = $this->valueJournal->record(
                fn () => $this->applyCounts($items, $products, $notes, $user, $reference),
                'STOCK_OPNAME',
                $reference,
                'Selisih stock opname '.$reference.($notes ? ": {$notes}" : ''),
                $ids->all()
            );

            return ['reference' => $reference, 'adjustments' => $out['result'], 'journal' => $out['journal']];
        }, 3); // korban deadlock/lock-wait diulang; closure hanya menulis DB, jadi aman diulang
    }

    /**
     * @param  Collection<int, Product>  $products  produk opname yang sudah dikunci, per id
     * @return array<int, array<string, mixed>>
     */
    private function applyCounts(array $items, Collection $products, ?string $notes, ?User $user, string $reference): array
    {
        $adjustments = [];
        foreach ($items as $item) {
            $product = $products->get((int) $item['product_id']);
            $system = (int) $product->product_quantity;
            $physical = (int) $item['physical_qty'];
            $diff = $physical - $system;
            // Lapisan FIFO dicocokkan ke hitungan fisik juga, sehingga stok tanpa batch (drift lama) ikut terkoreksi.
            // lockForUpdate = current read: snapshot transaksi bisa lebih tua dari kunci produk.
            $layerDiff = $physical - (int) ProductBatch::where('product_id', $product->id)->lockForUpdate()->sum('remaining_qty');
            if ($diff === 0 && $layerDiff === 0) {
                continue;
            }

            if ($layerDiff < 0) {
                $this->consumeOldest($product, -$layerDiff);
            } elseif ($layerDiff > 0) {
                $this->addSurplusBatch($product, $layerDiff, $reference);
            }

            $product->update(['product_quantity' => $physical]);

            if ($diff !== 0) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'movement_type' => $diff > 0 ? 'MASUK' : 'KELUAR',
                    'quantity' => abs($diff),
                    'balance_after' => $physical,
                    'reference_type' => 'STOCK_OPNAME',
                    'reference_id' => $reference,
                    'description' => 'Stock opname: sistem '.$system.', fisik '.$physical.($notes ? " ({$notes})" : ''),
                    'operator_name' => $user?->name ?? 'Admin Opname',
                    'branch_id' => $product->branch_id ?? 3,
                ]);
            }

            $adjustments[] = [
                'product_id' => $product->id,
                'product_name' => $product->product_name,
                'system_qty' => $system,
                'physical_qty' => $physical,
                'difference' => $diff,
            ];
        }

        return $adjustments;
    }

    private function consumeOldest(Product $product, int $qty): void
    {
        $batches = ProductBatch::where('product_id', $product->id)
            ->where('remaining_qty', '>', 0)
            ->orderBy('purchase_date')->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($batches as $batch) {
            if ($qty <= 0) {
                break;
            }
            $take = min($qty, (int) $batch->remaining_qty);
            $batch->decrement('remaining_qty', $take);
            $qty -= $take;
        }
    }

    private function addSurplusBatch(Product $product, int $qty, string $reference): void
    {
        $cost = ProductBatch::where('product_id', $product->id)
            ->orderByDesc('purchase_date')->orderByDesc('id')
            ->value('batch_cost') ?? $product->product_cost;

        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => "{$reference}-{$product->id}",
            'source_name' => 'Kelebihan stock opname',
            'purchase_date' => now()->toDateString(),
            'batch_cost' => $cost,
            'initial_qty' => $qty,
            'remaining_qty' => $qty,
            'branch_id' => $product->branch_id ?? 3,
        ]);
    }
}
