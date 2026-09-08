<?php

namespace App\Services\Inventory\Excel;

use Illuminate\Support\Facades\DB;

/**
 * Menentukan merek sebuah baris Excel. Urutan: alias di nama produk,
 * lalu nama sheet sebagai cadangan terakhir. Sheet merek tunggal sengaja
 * TIDAK didahulukan supaya HANKOOK di sheet Delium tidak salah label.
 */
class BrandResolver
{
    /** Nama sheet (huruf kecil) → alias merek bawaannya. */
    private const SHEET_FALLBACK = [
        'bridgestone' => 'bridgestone',
        'dunlop' => 'dunlop',
        'gt ( gajah tunggal )' => 'gt',
        'acellera' => 'accelera',
        'delium' => 'delium',
    ];

    /**
     * @param  array<string,array{id:int,name:string}>  $aliases  alias huruf kecil → merek
     */
    public function __construct(private array $aliases)
    {
        // Alias terpanjang diperiksa lebih dulu: "gt radial" harus menang atas "gt".
        uksort($this->aliases, fn ($a, $b) => strlen($b) <=> strlen($a));
    }

    public static function fromDatabase(): self
    {
        $rows = DB::table('brand_aliases as a')
            ->join('brands as b', 'a.brand_id', '=', 'b.id')
            ->get(['a.alias', 'b.id', 'b.name']);

        $map = [];
        foreach ($rows as $row) {
            $map[strtolower(trim($row->alias))] = ['id' => (int) $row->id, 'name' => $row->name];
        }

        return new self($map);
    }

    /**
     * @return array{brand_id:?int, brand_name:?string}
     */
    public function resolve(string $sheetName, string $rawName): array
    {
        $needle = $this->normalize($rawName);

        if (str_starts_with($needle, 'ban dalam ')) {
            $needle = trim(substr($needle, strlen('ban dalam ')));
        }

        foreach ($this->aliases as $alias => $brand) {
            if ($needle === $alias || str_starts_with($needle, $alias.' ')) {
                return ['brand_id' => $brand['id'], 'brand_name' => $brand['name']];
            }
        }

        $fallbackAlias = self::SHEET_FALLBACK[strtolower(trim($sheetName))] ?? null;
        if ($fallbackAlias !== null && isset($this->aliases[$fallbackAlias])) {
            $brand = $this->aliases[$fallbackAlias];

            return ['brand_id' => $brand['id'], 'brand_name' => $brand['name']];
        }

        return ['brand_id' => null, 'brand_name' => null];
    }

    /** Huruf kecil, tanpa isi kurung, spasi rapat. */
    private function normalize(string $value): string
    {
        $v = preg_replace('/\([^)]*\)/', ' ', mb_strtolower(trim($value)));

        return trim(preg_replace('/\s+/', ' ', $v));
    }
}
