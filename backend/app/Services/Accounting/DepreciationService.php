<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\FixedAsset;
use App\Models\FixedAssetDepreciation;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Penyusutan garis lurus bulanan. Satu jurnal per bulan (Dr 6-1011 per aset / Cr 1-3999), bertanggal akhir bulan.
 * Jumlah per aset = penyusutan kumulatif yang seharusnya s/d bulan itu − seluruh yang sudah dibukukan (bulan apa pun),
 * sehingga menjalankan ulang tidak membukukan apa pun, bulan yang terlanjur dikunci tersusul otomatis, dan bulan yang
 * dibuka kembali setelah tersusul di bulan berikutnya tidak disusutkan dua kali.
 */
class DepreciationService
{
    public const EXPENSE_ACCOUNT = '6-1011';
    public const REFERENCE_TYPE = 'DEPRECIATION';

    /** Percobaan ulang saat deadlock/lock wait timeout, seperti FixedAssetService. */
    private const ATTEMPTS = 3;

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public static function endOf(string $period): string
    {
        return Carbon::parse($period.'-01')->endOfMonth()->toDateString();
    }

    /**
     * $locking: bacaan berkunci (current read) untuk keputusan di bawah lockRegister() (run() dan gerbang tutup buku);
     * snapshot REPEATABLE READ yang dibuat sebelum kunci diperoleh tidak melihat penyusutan/aset yang commit selama menunggu.
     * Pratinjau (GET) membaca tanpa kunci.
     *
     * @return list<array{asset: FixedAsset, amount: float}>
     */
    public function pendingLines(string $period, bool $locking = false): array
    {
        $assets = FixedAsset::where('status', 'ACTIVE')
            ->where('depreciation_start', '<=', $period)
            ->orderBy('code')
            ->when($locking, fn ($q) => $q->sharedLock())
            ->get();
        $posted = FixedAssetDepreciation::whereIn('fixed_asset_id', $assets->modelKeys())
            ->groupBy('fixed_asset_id')
            ->selectRaw('fixed_asset_id, SUM(amount) AS total')
            ->when($locking, fn ($q) => $q->sharedLock())
            ->pluck('total', 'fixed_asset_id');

        $lines = [];
        foreach ($assets as $asset) {
            $cents = $asset->expectedCentsThrough($period) - FixedAsset::cents($posted[$asset->id] ?? 0);
            if ($cents > 0) {
                $lines[] = ['asset' => $asset, 'amount' => $cents / 100];
            }
        }

        return $lines;
    }

    public function pendingTotal(string $period, bool $locking = false): float
    {
        return round(array_sum(array_column($this->pendingLines($period, $locking), 'amount')), 2);
    }

    public function preview(string $period): array
    {
        self::assertPeriod($period);
        $end = self::endOf($period);
        $lock = PeriodLock::lockDate();
        $lines = $this->pendingLines($period);

        return [
            'period' => $period,
            'end_date' => $end,
            'is_locked' => $lock !== null && $end <= $lock,
            'blocked_reason' => $this->blockedReason($period, false),
            'lines' => array_map(fn (array $l) => [
                'fixed_asset_id' => $l['asset']->id,
                'code' => $l['asset']->code,
                'name' => $l['asset']->name,
                'amount' => $l['amount'],
            ], $lines),
            'total' => round(array_sum(array_column($lines, 'amount')), 2),
            'posted' => JournalEntry::where('reference_type', self::REFERENCE_TYPE)
                ->where('reference_id', "SUSUT-{$period}")
                ->orderBy('id')->get()
                ->map(fn (JournalEntry $j) => [
                    'entry_number' => $j->entry_number,
                    'entry_date' => $j->entry_date->toDateString(),
                    'total' => (float) $j->total_debit,
                ])->values()->all(),
        ];
    }

    /** Bukukan penyusutan yang tertunda s/d $period; null bila tidak ada yang perlu dibukukan. */
    public function run(string $period): ?JournalEntry
    {
        self::assertPeriod($period);

        return DB::transaction(function () use ($period) {
            FixedAssetService::lockRegister();

            $reason = $this->blockedReason($period, true);
            if ($reason !== null) {
                throw new PosRuleException($reason);
            }

            $lines = $this->pendingLines($period, true);
            if ($lines === []) {
                return null;
            }

            $draft = new JournalDraft();
            foreach ($lines as $line) {
                $draft->debit(self::EXPENSE_ACCOUNT, $line['amount'], "Penyusutan {$line['asset']->code} {$line['asset']->name}");
            }
            $total = round(array_sum(array_column($lines, 'amount')), 2);
            $draft->credit(FixedAssetService::ACCUMULATED_ACCOUNT, $total, "Akumulasi penyusutan {$period}");
            $entry = $draft->post($this->engine, self::REFERENCE_TYPE, "SUSUT-{$period}", "Penyusutan aset tetap garis lurus {$period}", self::endOf($period));

            foreach ($lines as $line) {
                FixedAssetDepreciation::create([
                    'fixed_asset_id' => $line['asset']->id,
                    'period' => $period,
                    'amount' => $line['amount'],
                    'journal_entry_id' => $entry->id,
                ]);
            }

            return $entry;
        }, self::ATTEMPTS);
    }

    /** Alasan penyusutan $period belum boleh dibukukan, atau null. */
    private function blockedReason(string $period, bool $locking): ?string
    {
        $lock = PeriodLock::lockDate($locking);
        if ($lock !== null && self::endOf($period) <= $lock) {
            return "Periode {$period} sudah ditutup; penyusutannya tidak dapat dibukukan lagi.";
        }

        // Bulan sebelumnya yang masih terbuka harus disusutkan dulu, agar beban tiap bulan jatuh di bulannya.
        $previous = Carbon::parse($period.'-01')->subMonthNoOverflow()->format('Y-m');
        $previousOpen = $lock === null || self::endOf($previous) > $lock;
        if ($previousOpen && $this->pendingTotal($previous, $locking) > 0) {
            return "Penyusutan {$previous} belum dijalankan. Jalankan penyusutan bulan itu lebih dulu.";
        }

        return null;
    }

    private static function assertPeriod(string $period): void
    {
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period) || $period > now()->format('Y-m')) {
            throw new PosRuleException('Periode penyusutan harus bulan berjalan atau bulan sebelumnya (format YYYY-MM).');
        }
    }
}
