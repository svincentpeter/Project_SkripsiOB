<?php

namespace App\Services\Inventory\Excel;

use Illuminate\Support\Facades\DB;

/**
 * Kunci identitas produk yang tahan terhadap variasi penulisan merek.
 *
 * "GT Radial Champiro 185/65 R15" dan "GT Champiro (2026) 185/65 R15"
 * menghasilkan kunci yang sama, sehingga baris Excel dan produk lama di
 * database tetap ketemu tanpa perlu mengubah nama tampilan produk.
 */
class StockMatchKey
{
    /** @return array<int,string> daftar alias huruf kecil, terpanjang dulu */
    public static function aliasesFromDatabase(): array
    {
        $aliases = DB::table('brand_aliases')->pluck('alias')->all();
        $aliases = array_map(fn ($a) => mb_strtolower(trim($a)), $aliases);
        usort($aliases, fn ($a, $b) => strlen($b) <=> strlen($a));

        return $aliases;
    }

    /** @param  array<int,string>  $aliases */
    public static function make(
        int $brandId,
        string $name,
        ?string $size,
        ?string $ring,
        array $aliases,
        ?int $year = null,
        bool $isOldStock = false
    ): string {
        $base = $brandId.'|'.self::normalizeName($name, $aliases)
            .'|'.self::normalizePart($size)
            .'|'.self::normalizePart($ring);

        // Jika tidak dipass tahun, coba ekstrak dari nama jika ada kurung berisi tahun: (22), (24), dst
        if ($year === null && preg_match('/\(\s*(?:th\.?\s*)?(\d{2,4})/i', $name, $m)) {
            $val = (int) $m[1];
            if ($val < 100) {
                $val += 2000;
            }
            if ($val >= 1990 && $val <= 2030) {
                $year = $val;
            }
        }

        // Tahun lama (< tahun berjalan) atau produk berstatus stok lama/promo
        // dipisahkan sebagai identitas produk sendiri agar tidak mencemari ban tahun baru.
        $currentYear = (int) date('Y');
        if ($year !== null && $year < $currentYear) {
            return $base.'|'.$year;
        }

        if ($isOldStock) {
            return $base.'|old';
        }

        return $base;
    }

    /** @param  array<int,string>  $aliases */
    public static function normalizeName(string $name, array $aliases): string
    {
        // Buang penanda harga normal dan kurung berisi angka (tahun).
        $n = preg_replace('/@\s*[\d.]+/', ' ', mb_strtolower(trim($name)));
        $n = preg_replace('/\(\s*(?:th\.?\s*)?[\d\s,+]+\)/i', ' ', (string) $n);
        $n = trim(preg_replace('/\s+/', ' ', (string) $n));

        if (str_starts_with($n, 'ban dalam ')) {
            $n = trim(substr($n, strlen('ban dalam ')));
        }

        foreach ($aliases as $alias) {
            if ($n === $alias) {
                return '';
            }
            if (str_starts_with($n, $alias.' ')) {
                return trim(substr($n, strlen($alias) + 1));
            }
        }

        return $n;
    }

    private static function normalizePart(?string $value): string
    {
        return mb_strtolower(trim(str_replace(' ', '', (string) $value)));
    }
}
