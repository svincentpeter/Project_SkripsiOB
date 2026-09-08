<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandAlias;
use App\Models\Product;
use App\Services\Inventory\Excel\BrandResolver;
use App\Services\Inventory\Excel\StockMatchKey;
use App\Services\Inventory\StockExcelImportService;
use App\Services\Inventory\StockOpnameCommitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockReconciliationApiController extends Controller
{
    protected StockExcelImportService $importService;
    protected StockOpnameCommitService $commitService;

    public function __construct(
        StockExcelImportService $importService,
        StockOpnameCommitService $commitService
    ) {
        $this->importService = $importService;
        $this->commitService = $commitService;
    }

    public function importPreview(Request $request): JsonResponse
    {
        $request->validate([
            'excel_file' => 'required|file|mimes:xlsx,xls|max:20480',
            'qty_column' => 'nullable|in:G,H',
        ]);

        $qtyColumn = $request->input('qty_column', 'H');
        $file = $request->file('excel_file');

        try {
            $staging = $this->importService->processExcelToStaging(
                $file->getRealPath(),
                storage_path('app/stock_migration/stock_staging.json'),
                $qtyColumn
            );

            $enriched = $this->enrichStagingWithDbMatch($staging);

            return response()->json([
                'success' => true,
                'message' => "File Excel berhasil diproses ({$staging['meta']['total_products']} produk, {$staging['meta']['total_stock_qty']} unit stok)",
                'data' => $enriched,
            ]);
        } catch (\Throwable $e) {
            Log::error('Gagal import preview Excel stok', ['exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses file Excel: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function getStaging(): JsonResponse
    {
        $path = storage_path('app/stock_migration/stock_staging.json');

        if (!file_exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada data staging yang diunggah',
                'data' => null,
            ]);
        }

        $staging = json_decode((string) file_get_contents($path), true);
        if (!$staging || !isset($staging['products'])) {
            return response()->json([
                'success' => false,
                'message' => 'Format data staging tidak valid',
                'data' => null,
            ], 422);
        }

        $enriched = $this->enrichStagingWithDbMatch($staging);

        return response()->json([
            'success' => true,
            'data' => $enriched,
        ]);
    }

    public function resolveBrand(Request $request): JsonResponse
    {
        $request->validate([
            'index' => 'required|integer',
            'brand_id' => 'required|exists:brands,id',
        ]);

        $path = storage_path('app/stock_migration/stock_staging.json');
        if (!file_exists($path)) {
            return response()->json(['success' => false, 'message' => 'File staging tidak ditemukan'], 404);
        }

        $staging = json_decode((string) file_get_contents($path), true);
        $index = (int) $request->input('index');
        $row = $staging['unresolved'][$index] ?? null;

        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Baris unresolved tidak ditemukan'], 404);
        }

        $alias = mb_strtolower(trim(preg_replace('/\([^)]*\)/', ' ', $row['name'])));
        $alias = trim(preg_replace('/\s+/', ' ', $alias));
        $firstWord = explode(' ', $alias)[0] ?? '';

        if ($firstWord === '') {
            return response()->json(['success' => false, 'message' => 'Alias tidak dapat diekstrak dari nama'], 422);
        }

        BrandAlias::updateOrCreate(
            ['alias' => $firstWord],
            ['brand_id' => $request->input('brand_id')]
        );

        unset($staging['unresolved'][$index]);
        $staging['unresolved'] = array_values($staging['unresolved']);
        $staging['meta']['rows_unresolved'] = count($staging['unresolved']);

        file_put_contents($path, json_encode($staging, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return response()->json([
            'success' => true,
            'message' => "Alias \"{$firstWord}\" berhasil disimpan. Silakan unggah ulang berkas untuk memuat barisnya.",
            'data' => $this->enrichStagingWithDbMatch($staging),
        ]);
    }

    public function resolveName(Request $request): JsonResponse
    {
        $request->validate([
            'index' => 'required|integer',
            'name' => 'required|string|min:2',
            'brand_id' => 'nullable|exists:brands,id',
        ]);

        $path = storage_path('app/stock_migration/stock_staging.json');
        if (!file_exists($path)) {
            return response()->json(['success' => false, 'message' => 'File staging tidak ditemukan'], 404);
        }

        $staging = json_decode((string) file_get_contents($path), true);
        $index = (int) $request->input('index');
        $row = $staging['unresolved'][$index] ?? null;

        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Baris unresolved tidak ditemukan'], 404);
        }

        $name = trim($request->input('name'));
        $sheet = $row['sheet'];
        $size = $row['size'] ?? null;
        $ring = $row['ring'] ?? null;
        $qty = (int) ($row['qty'] ?? 0);
        $cost = 0;
        $price = 0;

        $resolver = BrandResolver::fromDatabase();
        $brand = $resolver->resolve($sheet, $name);
        $brandId = $request->input('brand_id') ?? $brand['brand_id'] ?? 2; // Default Bridgestone if unknown
        $brandName = Brand::where('id', $brandId)->value('name') ?? $sheet;

        $aliases = StockMatchKey::aliasesFromDatabase();
        $matchKey = StockMatchKey::make($brandId, $name, $size, $ring, $aliases);

        $staging['products'][] = [
            'match_key' => $matchKey,
            'product_code' => '',
            'product_name' => $name,
            'brand_id' => $brandId,
            'brand_name' => $brandName,
            'category_id' => 1,
            'product_size' => (string) ($size ?? ''),
            'ring' => (string) ($ring ?? ''),
            'product_year' => (int) date('Y'),
            'product_price' => $price,
            'avg_cost' => $cost,
            'total_stock' => $qty,
            'opening_qty' => $qty,
            'is_old_stock' => false,
            'reference_price' => null,
            'sheet_name' => $sheet,
            'batches' => [
                [
                    'batch_cost' => $cost,
                    'initial_qty' => $qty,
                    'remaining_qty' => $qty,
                    'is_old_stock' => false,
                    'reference_price' => null,
                    'source_row' => $row['row'],
                ],
            ],
        ];

        unset($staging['unresolved'][$index]);
        $staging['unresolved'] = array_values($staging['unresolved']);
        $staging['meta']['rows_unresolved'] = count($staging['unresolved']);
        $staging['meta']['total_products'] = count($staging['products']);
        $staging['meta']['total_stock_qty'] = ($staging['meta']['total_stock_qty'] ?? 0) + $qty;
        $staging['meta']['total_opening_qty'] = ($staging['meta']['total_opening_qty'] ?? 0) + $qty;

        file_put_contents($path, json_encode($staging, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return response()->json([
            'success' => true,
            'message' => "Baris berhasil ditetapkan sebagai \"{$name}\"",
            'data' => $this->enrichStagingWithDbMatch($staging),
        ]);
    }

    public function ignoreUnresolved(Request $request): JsonResponse
    {
        $request->validate(['index' => 'required|integer']);

        $path = storage_path('app/stock_migration/stock_staging.json');
        if (!file_exists($path)) {
            return response()->json(['success' => false, 'message' => 'File staging tidak ditemukan'], 404);
        }

        $staging = json_decode((string) file_get_contents($path), true);
        $index = (int) $request->input('index');

        if (isset($staging['unresolved'][$index])) {
            unset($staging['unresolved'][$index]);
            $staging['unresolved'] = array_values($staging['unresolved']);
            $staging['meta']['rows_unresolved'] = count($staging['unresolved']);
            file_put_contents($path, json_encode($staging, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        return response()->json([
            'success' => true,
            'message' => 'Baris tak terselesaikan telah diabaikan',
            'data' => $this->enrichStagingWithDbMatch($staging),
        ]);
    }

    public function commit(Request $request): JsonResponse
    {
        $request->validate([
            'period' => 'required|regex:/^\d{4}-\d{2}$/',
            'only_match_keys' => 'nullable|array',
            'force' => 'nullable|boolean',
        ]);

        $path = storage_path('app/stock_migration/stock_staging.json');
        if (!file_exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'File staging belum tersedia. Silakan unggah file Excel terlebih dahulu.',
            ], 422);
        }

        $staging = json_decode((string) file_get_contents($path), true);
        if (!$staging || !isset($staging['products'])) {
            return response()->json([
                'success' => false,
                'message' => 'Format staging tidak valid.',
            ], 422);
        }

        $unresolvedCount = count($staging['unresolved'] ?? []);
        if ($unresolvedCount > 0 && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Masih ada {$unresolvedCount} baris tak terselesaikan. Bereskan dulu atau centang opsi paksa.",
            ], 422);
        }

        try {
            $hasil = $this->commitService->commit($staging, $request->input('period'), [
                'only_match_keys' => $request->input('only_match_keys'),
                'force' => $request->boolean('force'),
                'branch_id' => 3,
                'user_id' => auth()->id() ?? 1,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Sinkronisasi berhasil! Baru: {$hasil['created']}, diperbarui: {$hasil['updated']}, "
                    . "dinolkan: {$hasil['zeroed']}, dinonaktifkan: {$hasil['deactivated']}, batch: {$hasil['batches_created']}.",
                'data' => $hasil,
            ]);
        } catch (\Throwable $e) {
            Log::error('Sinkronisasi stok ke database gagal', ['exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Sinkronisasi gagal: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function downloadTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0); // remove default sheet

        $sheets = [
            'BRIDGESTONE' => [
                ['1', 'Bs Techno 185/65 R15', '185/65', '15', '650000', '850000', '10', '8'],
                ['2', 'Bs Turanza T005A (24) @1.250', '195/65', '15', '950000', '1250000', '5', '4'],
                ['3', 'Bs Ecopia EP150', '175/65', '14', '520000', '680000', '12', '10'],
            ],
            'DUNLOP' => [
                ['1', 'Dlp Enasave EC300+', '185/65', '15', '610000', '790000', '8', '6'],
                ['2', 'Dlp LM705', '195/60', '16', '750000', '980000', '6', '4'],
            ],
            'GT' => [
                ['1', 'GT Radial Champiro Ecotec', '185/70', '14', '490000', '640000', '14', '11'],
                ['2', 'GT Champiro GTX Pro', '195/55', '15', '580000', '750000', '8', '5'],
            ],
        ];

        foreach ($sheets as $title => $sampleRows) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle($title);

            // Title banner
            $sheet->setCellValue('A2', "DAFTAR INVENTORI STOK BAN - {$title}");
            $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(13);

            // Headers on row 4
            $headers = [
                'A4' => 'NO',
                'B4' => 'NAMA PRODUK BAN',
                'C4' => 'UKURAN',
                'D4' => 'RING',
                'E4' => 'MODAL (HPP)',
                'F4' => 'HARGA JUAL',
                'G4' => 'STOK AWAL',
                'H4' => 'SISA AKHIR',
            ];

            foreach ($headers as $cell => $text) {
                $sheet->setCellValue($cell, $text);
            }

            // Style headers
            $headerRange = 'A4:H4';
            $sheet->getStyle($headerRange)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
            $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('1E3A8A');
            $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Fill sample data
            $rowNum = 5;
            foreach ($sampleRows as $row) {
                $sheet->setCellValue("A{$rowNum}", $row[0]);
                $sheet->setCellValue("B{$rowNum}", $row[1]);
                $sheet->setCellValue("C{$rowNum}", $row[2]);
                $sheet->setCellValue("D{$rowNum}", $row[3]);
                $sheet->setCellValue("E{$rowNum}", $row[4]);
                $sheet->setCellValue("F{$rowNum}", $row[5]);
                $sheet->setCellValue("G{$rowNum}", $row[6]);
                $sheet->setCellValue("H{$rowNum}", $row[7]);
                $rowNum++;
            }

            // Auto column width
            foreach (range('A', 'H') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }
        }

        $fileName = 'Template_Stok_Ban_OmahBan.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    private function enrichStagingWithDbMatch(array $staging): array
    {
        $aliases = StockMatchKey::aliasesFromDatabase();
        $dbIndex = [];
        $dbCodeIndex = [];

        $allProducts = Product::whereNull('deleted_at')->get([
            'id', 'product_code', 'product_name', 'brand', 'brand_id', 'product_size', 'ring',
            'product_quantity', 'product_price', 'product_cost', 'product_year', 'is_old_stock',
        ]);

        foreach ($allProducts as $p) {
            $year = $p->product_year ? (int) $p->product_year : null;
            $isOld = (bool) ($p->is_old_stock ?? false);
            $bId = (int) ($p->brand_id ?: 0);
            if ($bId === 0 && !empty($p->brand)) {
                $bId = (int) (DB::table('brands')->where('name', $p->brand)->value('id') ?: 0);
            }

            $key = StockMatchKey::make(
                $bId,
                (string) $p->product_name,
                $p->product_size,
                $p->ring === null ? null : (string) $p->ring,
                $aliases,
                $year,
                $isOld
            );
            $dbIndex[$key] ??= $p;
            if (!empty($p->product_code)) {
                $dbCodeIndex[$p->product_code] ??= $p;
            }
        }

        $usedDbIds = [];
        $matchedCount = 0;
        $unmatchedCount = 0;
        $totalSurplus = 0;
        $totalDeficit = 0;
        $totalEqual = 0;

        $enrichedProducts = [];
        foreach ($staging['products'] ?? [] as $item) {
            $matchKey = $item['match_key'] ?? '';
            $dbProduct = null;

            if ($matchKey && isset($dbIndex[$matchKey]) && !in_array($dbIndex[$matchKey]->id, $usedDbIds, true)) {
                $dbProduct = $dbIndex[$matchKey];
            } elseif (!empty($item['product_code']) && isset($dbCodeIndex[$item['product_code']]) && !in_array($dbCodeIndex[$item['product_code']]->id, $usedDbIds, true)) {
                $dbProduct = $dbCodeIndex[$item['product_code']];
            }

            $dbMatch = null;
            if ($dbProduct) {
                $usedDbIds[] = $dbProduct->id;
                $matchedCount++;
                $dbQty = (int) $dbProduct->product_quantity;
                $diff = (int) $item['total_stock'] - $dbQty;

                if ($diff > 0) {
                    $totalSurplus++;
                } elseif ($diff < 0) {
                    $totalDeficit++;
                } else {
                    $totalEqual++;
                }

                $dbMatch = [
                    'id' => $dbProduct->id,
                    'code' => $dbProduct->product_code,
                    'name' => $dbProduct->product_name,
                    'qty' => $dbQty,
                    'price' => (int) $dbProduct->product_price,
                    'cost' => (int) $dbProduct->product_cost,
                    'diff' => $diff,
                    'confidence' => 'high',
                ];
            } else {
                $unmatchedCount++;
            }

            $enrichedProducts[] = array_merge($item, [
                'db_match' => $dbMatch,
            ]);
        }

        $staging['products'] = $enrichedProducts;
        $staging['stats'] = [
            'total_excel' => count($staging['products']),
            'total_stock_excel' => $staging['meta']['total_stock_qty'] ?? 0,
            'total_matched' => $matchedCount,
            'total_unmatched' => $unmatchedCount,
            'total_surplus' => $totalSurplus,
            'total_deficit' => $totalDeficit,
            'total_equal' => $totalEqual,
            'can_commit' => empty($staging['unresolved']),
        ];

        return $staging;
    }
}
