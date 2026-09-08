<?php

namespace App\Services\Inventory;

use App\Services\Inventory\Excel\BrandResolver;
use App\Services\Inventory\Excel\StockExcelReader;
use App\Services\Inventory\Excel\StockMatchKey;
use App\Services\Inventory\Excel\StockProductNameParser;
use RuntimeException;

/**
 * Mengubah berkas stok Excel menjadi data staging.
 *
 * Setiap baris berakhir di salah satu dari empat keranjang: produk,
 * batch anak, catatan, atau tak-terselesaikan. Jumlah keempatnya wajib
 * sama dengan jumlah baris terbaca — tidak ada baris yang boleh hilang.
 */
class StockExcelImportService
{
    private const CATEGORY_BAN = 1;

    private const CATEGORY_BAN_DALAM = 3;

    private const CATEGORY_TRUCK = 4;

    public function __construct(
        private StockExcelReader $reader = new StockExcelReader,
        private StockProductNameParser $nameParser = new StockProductNameParser,
    ) {}

    /**
     * @param  string  $qtyColumn  'H' = sisa akhir bulan (bawaan), 'G' = stok awal bulan
     */
    public function processExcelToStaging(string $filePath, ?string $outputPath = null, string $qtyColumn = 'H'): array
    {
        if (! in_array($qtyColumn, ['G', 'H'], true)) {
            throw new RuntimeException("Kolom kuantitas tidak dikenal: {$qtyColumn}");
        }

        $outputPath = $outputPath ?? storage_path('app/stock_migration/stock_staging.json');
        $resolver = BrandResolver::fromDatabase();
        $aliases = StockMatchKey::aliasesFromDatabase();

        $rows = $this->reader->readRows($filePath);

        $groups = [];
        $notes = [];
        $unresolved = [];
        $counts = ['product' => 0, 'child' => 0, 'note' => 0, 'unresolved' => 0];
        $lastParent = null;

        foreach ($rows as $row) {
            $cells = $row['cells'];
            $rawName = trim((string) ($cells['B'] ?? ''));

            if ($this->isNoteRow($rawName)) {
                $notes[] = ['sheet' => $row['sheet'], 'row' => $row['row'], 'text' => $rawName];
                $counts['note']++;

                continue;
            }

            $isChild = $rawName === '';

            if ($isChild) {
                if ($lastParent === null || $lastParent['sheet'] !== $row['sheet']) {
                    $unresolved[] = $this->unresolvedRow($row, $rawName, 'batch_tanpa_induk', $qtyColumn);
                    $counts['unresolved']++;

                    continue;
                }

                $parsed = [
                    'clean_name' => $lastParent['clean_name'],
                    'product_year' => $lastParent['product_year'],
                    'reference_price' => null,
                ];
                $brandId = $lastParent['brand_id'];
                $brandName = $lastParent['brand_name'];
            } else {
                $parsed = $this->nameParser->parse($rawName);

                if ($parsed['clean_name'] === '') {
                    $unresolved[] = $this->unresolvedRow($row, $rawName, 'nama_kosong', $qtyColumn);
                    $counts['unresolved']++;

                    continue;
                }

                $brand = $resolver->resolve($row['sheet'], $rawName);
                $brandId = $brand['brand_id'];
                $brandName = $brand['brand_name'];

                if ($brandId === null) {
                    $unresolved[] = $this->unresolvedRow($row, $rawName, 'brand_tidak_dikenal', $qtyColumn);
                    $counts['unresolved']++;

                    continue;
                }
            }

            $size = $this->stringOrNull($cells['C'] ?? null);
            $ring = $this->stringOrNull($cells['D'] ?? null);
            $cost = $this->toInt($cells['E'] ?? null);
            $price = $this->toInt($cells['F'] ?? null);
            $opening = $this->toInt($cells['G'] ?? null) ?? 0;
            $qty = $this->toInt($cells[$qtyColumn] ?? null) ?? 0;

            if ($price === null && $parsed['reference_price'] !== null) {
                $price = $parsed['reference_price'];
            }
            if ($price === null && isset($lastParent['price']) && ($lastParent['clean_name'] ?? '') === $parsed['clean_name']) {
                $price = $lastParent['price'];
            }

            $isOldStock = $row['name_is_red'] || $parsed['reference_price'] !== null;

            if (! $isChild) {
                $lastParent = [
                    'sheet' => $row['sheet'],
                    'clean_name' => $parsed['clean_name'],
                    'product_year' => $parsed['product_year'],
                    'brand_id' => $brandId,
                    'brand_name' => $brandName,
                    'price' => $price,
                ];
                $counts['product']++;
            } else {
                $counts['child']++;
            }

            $currentYear = (int) date('Y');
            $yearForGroup = $parsed['product_year'] ?? $currentYear;
            $key = StockMatchKey::make($brandId, $parsed['clean_name'], $size, $ring, $aliases, $yearForGroup, $isOldStock);

            if (! isset($groups[$key])) {
                $displayName = $parsed['clean_name'];

                $groups[$key] = [
                    'match_key' => $key,
                    'product_code' => '',
                    'product_name' => $displayName,
                    'brand_id' => $brandId,
                    'brand_name' => $brandName,
                    'category_id' => $this->categoryFor($row['sheet']),
                    'product_size' => $size,
                    'ring' => $ring,
                    'product_year' => $yearForGroup,
                    'product_price' => $price,
                    'avg_cost' => null,
                    'total_stock' => 0,
                    'opening_qty' => 0,
                    'is_old_stock' => $isOldStock,
                    'reference_price' => $parsed['reference_price'],
                    'sheet_name' => $row['sheet'],
                    'batches' => [],
                ];
            }

            $g = &$groups[$key];
            $g['batches'][] = [
                'batch_cost' => $cost,
                'initial_qty' => $qty,
                'remaining_qty' => $qty,
                'is_old_stock' => $isOldStock,
                'reference_price' => $parsed['reference_price'],
                'source_row' => $row['row'],
            ];
            $g['total_stock'] += $qty;
            $g['opening_qty'] += $opening;
            $g['is_old_stock'] = $g['is_old_stock'] || $isOldStock;

            if ($parsed['reference_price'] !== null) {
                $g['reference_price'] = max((int) $g['reference_price'], $parsed['reference_price']);
            }
            if ($g['product_price'] === null && $price !== null) {
                $g['product_price'] = $price;
            }
            unset($g);
        }

        $products = [];
        $idx = 0;
        foreach ($groups as $group) {
            $idx++;
            $group['product_year'] = $group['product_year'] ?? (int) date('Y');
            $group['avg_cost'] = $this->weightedCost($group['batches']);
            $group['product_code'] = $this->generateProductCode(
                $group['brand_name'],
                $group['product_size'],
                $group['ring'],
                $idx
            );
            $products[] = $group;
        }

        $rowsRead = count($rows);
        $classified = $counts['product'] + $counts['child'] + $counts['note'] + $counts['unresolved'];

        if ($rowsRead !== $classified) {
            throw new RuntimeException(
                "Ada baris Excel yang hilang: terbaca {$rowsRead}, terklasifikasi {$classified}."
            );
        }

        $output = [
            'meta' => [
                'source' => basename($filePath),
                'generated_at' => date('c'),
                'qty_column' => $qtyColumn,
                'rows_read' => $rowsRead,
                'rows_product' => $counts['product'],
                'rows_child' => $counts['child'],
                'rows_note' => $counts['note'],
                'rows_unresolved' => $counts['unresolved'],
                'total_products' => count($products),
                'total_batches' => array_sum(array_map(fn ($p) => count($p['batches']), $products)),
                'total_stock_qty' => array_sum(array_column($products, 'total_stock')),
                'total_opening_qty' => array_sum(array_column($products, 'opening_qty')),
                'products_without_price' => count(array_filter($products, fn ($p) => empty($p['product_price']))),
                'products_without_cost' => count(array_filter($products, fn ($p) => empty($p['avg_cost']))),
            ],
            'products' => $products,
            'notes' => $notes,
            'unresolved' => $unresolved,
        ];

        $dir = dirname($outputPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($outputPath, json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return $output;
    }

    private function isNoteRow(string $rawName): bool
    {
        if ($rawName === '') {
            return false;
        }

        if (str_starts_with($rawName, '*')) {
            return true;
        }

        return str_ends_with(rtrim($rawName), ':');
    }

    private function unresolvedRow(array $row, string $rawName, string $reason, string $qtyColumn): array
    {
        return [
            'sheet' => $row['sheet'],
            'row' => $row['row'],
            'name' => $rawName,
            'reason' => $reason,
            'size' => $this->stringOrNull($row['cells']['C'] ?? null),
            'ring' => $this->stringOrNull($row['cells']['D'] ?? null),
            'qty' => $this->toInt($row['cells'][$qtyColumn] ?? null) ?? 0,
        ];
    }

    private function categoryFor(string $sheetName): int
    {
        $s = mb_strtolower($sheetName);

        if (str_contains($s, 'ban dalam')) {
            return self::CATEGORY_BAN_DALAM;
        }
        if (str_contains($s, 'truck') || str_contains($s, 'diesel')) {
            return self::CATEGORY_TRUCK;
        }

        return self::CATEGORY_BAN;
    }

    /** @param  array<int,array{batch_cost:?int,initial_qty:int}>  $batches */
    private function weightedCost(array $batches): ?int
    {
        $qty = 0;
        $value = 0;

        foreach ($batches as $b) {
            if ($b['batch_cost'] === null || $b['initial_qty'] <= 0) {
                continue;
            }
            $qty += $b['initial_qty'];
            $value += $b['batch_cost'] * $b['initial_qty'];
        }

        return $qty > 0 ? (int) round($value / $qty) : null;
    }

    private function generateProductCode(?string $brandName, ?string $size, ?string $ring, int $idx): string
    {
        $b = strtoupper(substr($brandName ?? 'UNK', 0, 3));
        $s = str_replace(['/', ' '], '', (string) ($size ?? '0'));
        $r = trim((string) ($ring ?? '0'));

        return sprintf('%s-%s-%s-%04d', $b, $s === '' ? '0' : $s, $r === '' ? '0' : $r, $idx);
    }

    private function stringOrNull(mixed $value): ?string
    {
        $v = trim((string) ($value ?? ''));

        return $v === '' ? null : $v;
    }

    private function toInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $v = str_replace(['.', ',', ' ', 'Rp', 'rp'], '', trim((string) $value));

        return is_numeric($v) ? (int) round((float) $v) : null;
    }
}
