<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\Product;
use App\Models\ServiceMaster;

/**
 * Menormalkan baris keranjang dari klien menjadi baris yang dihitung server:
 * nama & referensi katalog divalidasi, nilai kotor/diskon/bersih dihitung ulang.
 */
class CartLines
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  bool  $reserveStock  kunci produk & tolak bila qty melebihi stok (checkout)
     * @return array<int, array<string, mixed>>
     */
    public static function build(array $items, bool $reserveStock): array
    {
        $requested = [];
        $lines = [];

        foreach ($items as $item) {
            $type = $item['type'];
            $isManual = (bool) ($item['is_manual'] ?? false);
            $qty = (int) $item['quantity'];
            $unitPrice = round((float) $item['unit_price'], 2);
            $discountPerItem = round((float) ($item['discount_per_item'] ?? 0), 2);
            $product = null;
            $serviceId = null;
            $name = trim((string) $item['name']);

            if ($type === 'PRODUCT' && ! $isManual) {
                if (empty($item['product_id'])) {
                    throw new PosRuleException("Produk \"{$name}\" tidak terdaftar di katalog.");
                }
                $query = Product::query();
                if ($reserveStock) {
                    $query->lockForUpdate();
                }
                $product = $query->find($item['product_id']);
                if (! $product || ! $product->is_active) {
                    throw new PosRuleException("Produk \"{$name}\" tidak ditemukan atau sudah nonaktif.");
                }
                $name = $product->product_name;

                if ($reserveStock) {
                    $requested[$product->id] = ($requested[$product->id] ?? 0) + $qty;
                    if ($requested[$product->id] > $product->product_quantity) {
                        throw new PosRuleException("Stok {$product->product_name} tidak cukup (sisa {$product->product_quantity}).");
                    }
                }
            }

            if ($type === 'SERVICE' && ! empty($item['service_id'])) {
                $service = ServiceMaster::find($item['service_id']);
                if (! $service) {
                    throw new PosRuleException("Jasa \"{$name}\" tidak ditemukan.");
                }
                $serviceId = $service->id;
                $name = $service->service_name;
            }

            $gross = round($qty * $unitPrice, 2);
            $discount = round($qty * $discountPerItem, 2);
            if ($discount > $gross) {
                throw new PosRuleException("Diskon untuk \"{$name}\" melebihi harga barisnya.");
            }

            $lines[] = [
                'type' => $type,
                'is_manual' => $isManual,
                'product' => $product,
                'service_id' => $serviceId,
                'name' => $name,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'discount_per_item' => $discountPerItem,
                'gross' => $gross,
                'discount' => $discount,
                'net' => round($gross - $discount, 2),
                'manual_cost' => $isManual ? round((float) ($item['cost_price'] ?? 0), 2) : 0.0,
            ];
        }

        return $lines;
    }
}
