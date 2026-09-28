<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Nomor dokumen berurutan per bulan: {PREFIX}-YYYYMM-0001.
 * Bulan diambil dari tanggal dokumen bila diberikan (default: hari ini).
 * Dipanggil di dalam transaksi DB; baris terakhir dikunci agar dua pengguna tidak mendapat nomor sama.
 */
final class DocumentNumber
{
    /**
     * @param  class-string<Model>  $model
     */
    public static function next(string $model, string $column, string $prefix, ?string $date = null): string
    {
        $month = ($date !== null ? Carbon::parse($date) : now())->format('Ym');
        $monthPrefix = $prefix.'-'.$month.'-';

        $last = $model::where($column, 'like', $monthPrefix.'%')
            ->orderBy($column, 'desc')
            ->lockForUpdate()
            ->value($column);

        $seq = $last ? ((int) substr($last, strlen($monthPrefix))) + 1 : 1;

        return $monthPrefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
