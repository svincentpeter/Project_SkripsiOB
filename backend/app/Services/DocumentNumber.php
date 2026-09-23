<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

/**
 * Nomor dokumen berurutan per bulan: {PREFIX}-YYYYMM-0001.
 * Dipanggil di dalam transaksi DB; baris terakhir dikunci agar dua kasir tidak mendapat nomor sama.
 */
final class DocumentNumber
{
    /**
     * @param  class-string<Model>  $model
     */
    public static function next(string $model, string $column, string $prefix): string
    {
        $monthPrefix = $prefix.'-'.now()->format('Ym').'-';

        $last = $model::where($column, 'like', $monthPrefix.'%')
            ->orderBy($column, 'desc')
            ->lockForUpdate()
            ->value($column);

        $seq = $last ? ((int) substr($last, strlen($monthPrefix))) + 1 : 1;

        return $monthPrefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
