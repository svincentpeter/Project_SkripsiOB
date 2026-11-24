<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\Product;
use App\Models\ServiceMaster;
use App\Models\User;

/**
 * Menormalkan baris keranjang dari klien menjadi baris yang dihitung server:
 * nama & referensi katalog divalidasi, nilai kotor/diskon/bersih dihitung ulang,
 * produk katalog dikunci, qty dicek terhadap stok, dan harga jual dicek terhadap
 * standar minimal +15% dari HPP patokan batch FIFO.
 */
class CartLines
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    public static function build(array $items, ?User $user = null): array
    {
        $requested = [];
        $lines = [];
        $rupiah = fn (float $v) => 'Rp '.number_format($v, 0, ',', '.');

        // Kunci semua produk katalog urut id sebelum membaca apa pun, sama dengan void, retur dan opname: urutan
        // keranjang yang berlawanan dengan transaksi lain tidak boleh membentuk siklus deadlock.
        $ids = collect($items)->where('type', 'PRODUCT')->pluck('product_id')->filter()
            ->map(fn ($id) => (int) $id)->unique()->sort()->values();
        $products = Product::with('activeBatches')->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        foreach ($items as $item) {
            $type = $item['type'];
            $isManual = (bool) ($item['is_manual'] ?? false);
            $qty = (int) $item['quantity'];
            $unitPrice = round((float) $item['unit_price'], 2);
            $discountPerItem = round((float) ($item['discount_per_item'] ?? 0), 2);
            $rawReason = trim((string) ($item['override_reason'] ?? ''));
            $product = null;
            $serviceId = null;
            $name = trim((string) $item['name']);
            $catalogPrice = $unitPrice;
            $referenceHpp = 0.0;
            $overrideType = null;
            $overrideReason = null;

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
                if ($unitPrice <= 0) {
                    throw new PosRuleException("Harga jual {$product->product_name} ({$product->product_code}) masih Rp 0. Isi harga jualnya di katalog dulu.");
                }

                $requested[$product->id] = ($requested[$product->id] ?? 0) + $qty;
                if ($requested[$product->id] > $product->product_quantity) {
                    throw new PosRuleException("Stok {$product->product_name} tidak cukup (sisa {$product->product_quantity}).");
                }

                $catalogPrice = round((float) ($product->product_price ?? 0), 2);
                $referenceHpp = $product->referenceHpp();
                $minSellingPrice = $product->minimumSellingPrice();
                $effectiveUnitPrice = round($unitPrice - $discountPerItem, 2);

                $isInitialPrice = $catalogPrice <= 0;
                $isUnitPriceOverridden = ! $isInitialPrice && abs($unitPrice - $catalogPrice) > 0.01;

                // Standar minimal keuntungan +15% dari HPP patokan batch tertinggi (dihitung setelah diskon baris).
                if (($isInitialPrice || $isUnitPriceOverridden || $catalogPrice + 0.01 >= $minSellingPrice)
                    && $referenceHpp > 0
                    && $effectiveUnitPrice + 0.01 < $minSellingPrice) {
                    throw new PosRuleException(
                        "Harga jual bersih {$product->product_name} ({$rupiah($effectiveUnitPrice)}) kurang dari standar keuntungan minimal 15% dari HPP {$rupiah($referenceHpp)} (minimal {$rupiah($minSellingPrice)})."
                    );
                }

                // Jika harga katalog sudah ditentukan Owner (> Rp 0), Role Kasir hanya boleh menjual sesuai harga
                // katalog atau menaikkan harga (misal permintaan reimburse pembeli), tidak boleh menurunkan harga.
                if (! $isInitialPrice && $user?->role === 'KASIR' && $effectiveUnitPrice + 0.01 < $catalogPrice) {
                    throw new PosRuleException(
                        "Role Kasir tidak diizinkan menurunkan harga bersih {$product->product_name} ({$rupiah($effectiveUnitPrice)}) di bawah harga standar katalog ({$rupiah($catalogPrice)})."
                    );
                }

                if ($isInitialPrice) {
                    if ($user?->role === 'KASIR' && mb_strlen($rawReason) < 5) {
                        throw new PosRuleException(
                            "Harga katalog {$product->product_name} masih Rp 0. Kasir wajib mengisi alasan penentuan harga jual (minimal 5 karakter)."
                        );
                    }
                    $overrideType = 'INITIAL_CASHIER_PRICE';
                    $overrideReason = $rawReason !== '' ? $rawReason : 'Penentuan harga jual darurat di POS (harga katalog Rp 0)';
                } elseif ($isUnitPriceOverridden) {
                    if ($user?->role === 'KASIR' && mb_strlen($rawReason) < 5) {
                        throw new PosRuleException(
                            "Harap isi alasan perubahan harga jual {$product->product_name} (minimal 5 karakter, misal: Permintaan pembeli untuk reimburse)."
                        );
                    }
                    $overrideType = $user?->role === 'KASIR' ? 'CASHIER_NOTA_MARKUP' : 'OWNER_OVERRIDE';
                    $overrideReason = $rawReason !== '' ? $rawReason : 'Penyesuaian harga jual di nota POS';
                }
            }

            if ($type === 'SERVICE' && ! empty($item['service_id'])) {
                $service = ServiceMaster::find($item['service_id']);
                if (! $service) {
                    throw new PosRuleException("Jasa \"{$name}\" tidak ditemukan.");
                }
                $serviceId = $service->id;
                $name = $service->service_name;
                $catalogPrice = round((float) ($service->standard_price ?? 0), 2);
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
                'catalog_price' => $catalogPrice,
                'reference_hpp' => $referenceHpp,
                'discount_per_item' => $discountPerItem,
                'price_override_type' => $overrideType,
                'price_override_reason' => $overrideReason,
                'gross' => $gross,
                'discount' => $discount,
                'net' => round($gross - $discount, 2),
            ];
        }

        return $lines;
    }
}
