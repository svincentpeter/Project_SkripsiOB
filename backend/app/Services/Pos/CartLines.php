<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\Product;
use App\Models\ServiceMaster;

/**
 * Menormalkan baris keranjang dari klien menjadi baris yang dihitung server:
 * nama & referensi katalog divalidasi, nilai kotor/diskon/bersih dihitung ulang,
 * produk katalog dikunci dan qty-nya dicek terhadap stok.
 */
class CartLines
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    public static function build(array $items): array
    {
        $requested = [];
        $lines = [];
        // Kunci semua produk katalog urut id sebelum membaca apa pun, sama dengan void, retur dan opname: urutan
        // keranjang yang berlawanan dengan transaksi lain tidak boleh membentuk siklus deadlock.
        $ids = collect($items)->where('type', 'PRODUCT')->pluck('product_id')->filter()
            ->map(fn ($id) => (int) $id)->unique()->sort()->values();
        $products = Product::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        foreach ($items as $item) {
            $type = $item['type'];
            $isManual = (bool) ($item['is_manual'] ?? false);
            $qty = (int) $item['quantity'];
            $unitPrice = round((float) $item['unit_price'], 2);
            $discountPerItem = round((float) ($item['discount_per_item'] ?? 0), 2);
            $product = null;
            $serviceId = null;
            $name = trim((string) $item['name']);

            // Barang harus lewat katalog + penerimaan barang agar punya HPP FIFO; item manual hanya jasa (4-1001, tanpa HPP).
            if ($type === 'PRODUCT' && $isManual) {
                throw new PosRuleException("Barang \"{$name}\" belum terdaftar di katalog. Daftarkan produknya dan catat penerimaan barangnya dulu; item manual hanya untuk jasa.");
            }

            if ($type === 'PRODUCT') {
                if (empty($item['product_id'])) {
                    throw new PosRuleException("Produk \"{$name}\" tidak terdaftar di katalog.");
                }
                $product = $products->get((int) $item['product_id']);
                if (! $product || ! $product->is_active) {
                    throw new PosRuleException("Produk \"{$name}\" tidak ditemukan atau sudah nonaktif.");
                }
                $name = $product->product_name;

                $requested[$product->id] = ($requested[$product->id] ?? 0) + $qty;
                if ($requested[$product->id] > $product->product_quantity) {
                    throw new PosRuleException("Stok {$product->product_name} tidak cukup (sisa {$product->product_quantity}).");
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
            ];
        }

        return $lines;
    }
}
