<?php

namespace App\Services\Inventory\Excel;

/**
 * Memisahkan nama produk dari penanda tahun produksi "(24)" dan
 * penanda harga normal "@1.325". Teks dalam kurung yang bukan angka
 * (mis. "(Jeep)", "(semislick)") adalah varian produk dan dipertahankan.
 */
class StockProductNameParser
{
    private const YEAR_MIN = 1990;

    private const YEAR_MAX = 2030;

    /**
     * @return array{clean_name:string, product_year:?int, reference_price:?int}
     */
    public function parse(string $rawName): array
    {
        $name = trim($rawName);

        $referencePrice = null;
        if (preg_match('/@\s*([\d.]+)/', $name, $m)) {
            $digits = str_replace('.', '', $m[1]);
            if ($digits !== '' && ctype_digit($digits)) {
                $referencePrice = (int) $digits * 1000;
            }
            $name = preg_replace('/@\s*[\d.]+/', ' ', $name);
        }

        $year = null;
        // Hanya kurung yang isinya angka (boleh diawali "th", dipisah koma/plus/spasi).
        $name = preg_replace_callback(
            '/\(\s*(?:th\.?\s*)?(\d{2,4}(?:\s*[,+]\s*\d{2,4})*)\s*\)/i',
            function (array $m) use (&$year): string {
                preg_match_all('/\d{2,4}/', $m[1], $found);
                foreach ($found[0] as $token) {
                    $candidate = $this->toYear($token);
                    if ($candidate !== null && ($year === null || $candidate > $year)) {
                        $year = $candidate;
                    }
                }

                return ' ';
            },
            $name
        );

        $clean = trim(preg_replace('/\s+/', ' ', $name));

        return [
            'clean_name' => $clean,
            'product_year' => $year,
            'reference_price' => $referencePrice,
        ];
    }

    private function toYear(string $token): ?int
    {
        $n = (int) $token;

        if (strlen($token) === 4) {
            return ($n >= self::YEAR_MIN && $n <= self::YEAR_MAX) ? $n : null;
        }

        if (strlen($token) === 2) {
            if ($n >= 13 && $n <= 29) {
                return 2000 + $n;
            }
            if ($n >= 90 && $n <= 99) {
                return 1900 + $n;
            }
        }

        return null;
    }
}
