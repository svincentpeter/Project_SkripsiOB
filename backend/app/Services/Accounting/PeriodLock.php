<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\AccountingPeriodClosing;
use Illuminate\Support\Carbon;

/**
 * Kunci periode: jurnal bertanggal sampai akhir periode terakhir yang ditutup tidak boleh dibukukan.
 */
final class PeriodLock
{
    public static function lockDate(): ?string
    {
        $date = AccountingPeriodClosing::whereNull('reopened_at')->max('end_date');

        return $date ? Carbon::parse($date)->toDateString() : null;
    }

    public static function assertOpen(string $date): void
    {
        // Bandingkan sebagai Y-m-d: string tanggal-waktu atau format lain membuat perbandingan teks salah.
        $date = Carbon::parse($date)->toDateString();
        $lock = self::lockDate();
        if ($lock !== null && $date <= $lock) {
            throw new PosRuleException("Periode sampai {$lock} sudah ditutup; transaksi bertanggal {$date} tidak dapat dibukukan.");
        }
    }
}
