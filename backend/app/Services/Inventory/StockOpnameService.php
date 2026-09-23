<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\DocumentNumber;

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
        $reference = DocumentNumber::next(StockMovement::class, 'reference_id', 'OPN');

        $out = $this->valueJournal->record(function () use ($items, $notes, $user, $reference) {
            $adjustments = [];
            foreach ($items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                $system = (int) $product->product_quantity;
                $physical = (int) $item['physical_qty'];
                $diff = $physical - $system;
                if ($diff === 0) {
                    continue;
                }

                $diff < 0
                    ? $this->consumeOldest($product, -$diff)
                    : $this->addSurplusBatch($product, $diff, $reference);

                $product->update(['product_quantity' => $physical]);

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

                $adjustments[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->product_name,
                    'system_qty' => $system,
                    'physical_qty' => $physical,
                    'difference' => $diff,
                ];
            }

            return $adjustments;
        }, 'STOCK_OPNAME', $reference, 'Selisih stock opname '.$reference.($notes ? ": {$notes}" : ''));

        return ['reference' => $reference, 'adjustments' => $out['result'], 'journal' => $out['journal']];
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
