<?php

namespace App\Services\Inventory\Excel;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\RichText\Run;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Membaca berkas stok Excel apa adanya: nilai tersimpan untuk sel formula,
 * plus penanda warna font pada kolom nama.
 */
class StockExcelReader
{
    /** Kolom yang dipakai; kolom tanggal (I dan seterusnya) diabaikan. */
    private const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    /** Warna font yang dianggap merah (penanda stok lama/promo). */
    private const RED_RGB = ['FF0000', 'C00000'];

    /**
     * @return array<int, array{sheet:string,row:int,cells:array<string,mixed>,name_is_red:bool}>
     */
    public function readRows(string $filePath, int $startRow = 5): array
    {
        $reader = IOFactory::createReaderForFile($filePath);
        // Style dibutuhkan untuk warna font, jadi read-data-only tidak dipakai.
        $spreadsheet = $reader->load($filePath);

        $out = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $highest = $sheet->getHighestDataRow();

            for ($row = $startRow; $row <= $highest; $row++) {
                $cells = [];
                foreach (self::COLUMNS as $col) {
                    $cells[$col] = $this->cellValue($sheet, $col, $row);
                }

                if ($this->isBlank($cells)) {
                    continue;
                }

                $out[] = [
                    'sheet' => $sheet->getTitle(),
                    'row' => $row,
                    'cells' => $cells,
                    'name_is_red' => $this->isRed($sheet, 'B', $row),
                ];
            }
        }

        $spreadsheet->disconnectWorksheets();

        return $out;
    }

    /**
     * Nilai sel; untuk formula ambil hasil hitung yang disimpan Excel.
     * Tidak pernah memanggil getCalculatedValue() — mesin kalkulasi
     * PhpSpreadsheet tidak mengenal fungsi seperti _xlfn.SINGLE.
     */
    private function cellValue(Worksheet $sheet, string $col, int $row): mixed
    {
        $cell = $sheet->getCell($col.$row);
        $value = $cell->getValue();

        if ($value instanceof RichText) {
            $value = $value->getPlainText();
        }

        if (is_string($value) && str_starts_with($value, '=')) {
            return $cell->getOldCalculatedValue();
        }

        return $value;
    }

    private function isRed(Worksheet $sheet, string $col, int $row): bool
    {
        $argb = $sheet->getStyle($col.$row)->getFont()->getColor()->getARGB();

        if (is_string($argb) && in_array(strtoupper(substr($argb, -6)), self::RED_RGB, true)) {
            return true;
        }

        $raw = $sheet->getCell($col.$row)->getValue();
        if ($raw instanceof RichText) {
            foreach ($raw->getRichTextElements() as $el) {
                if ($el instanceof Run) {
                    $elArgb = $el->getFont()?->getColor()?->getARGB();
                    if (is_string($elArgb) && in_array(strtoupper(substr($elArgb, -6)), self::RED_RGB, true)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /** Baris kosong jika semua kolom yang dibaca tidak berisi apa pun. */
    private function isBlank(array $cells): bool
    {
        foreach ($cells as $v) {
            if ($v !== null && trim((string) $v) !== '') {
                return false;
            }
        }

        return true;
    }
}
