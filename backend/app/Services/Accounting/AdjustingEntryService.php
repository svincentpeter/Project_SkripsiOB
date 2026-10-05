<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Jurnal penyesuaian (AJP) akhir bulan:
 * - ACCRUAL: beban sudah terjadi, belum dibayar → Dr beban / Cr 2-1100; boleh dibalik otomatis tanggal 1 bulan berikutnya.
 * - PREPAID: beban dibayar di muka yang sudah terpakai → Dr beban / Cr 1-1100.
 */
class AdjustingEntryService
{
    public const ENTRY = 'ADJUSTING_ENTRY';
    public const REVERSAL = 'ADJUSTING_REVERSAL';
    public const ACCRUED = '2-1100';
    public const PREPAID = '1-1100';

    /** Percobaan ulang saat deadlock/lock wait timeout, mis. dua AJP bulan yang sama berebut celah nomor AJP. */
    private const ATTEMPTS = 3;

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{period: string, kind: string, account_code: string, amount: float|int|string, description: string, auto_reverse?: bool}  $data
     * @return list<JournalEntry>
     */
    public function create(array $data): array
    {
        if ($data['period'] > now()->format('Y-m')) {
            throw new PosRuleException('Jurnal penyesuaian hanya untuk bulan berjalan atau bulan sebelumnya.');
        }
        $end = Carbon::parse($data['period'].'-01')->endOfMonth()->toDateString();

        return DB::transaction(function () use ($data, $end) {
            // Kunci S baris Laba Ditahan sebelum kunci nomor apa pun: tutup/buka buku memegang X baris ini sepanjang
            // transaksinya, jadi AJP tidak bisa masuk ke bulan yang sedang ditutup (urutan S 3-2000 → AJP → JRN).
            Account::where('account_code', PeriodClosingService::RETAINED_EARNINGS)->sharedLock()->first();
            $lock = PeriodLock::lockDate(locking: true);
            // Tanggal pembalik (tanggal 1 bulan berikutnya) selalu setelah $end, dan tutup buku menyapu bulan-bulan
            // sebelumnya; jadi bila $end masih terbuka, tanggal pembalik juga terbuka. createEntry memeriksa ulang keduanya.
            if ($lock !== null && $end <= $lock) {
                throw new PosRuleException("Periode {$data['period']} sudah ditutup (sampai {$lock}); jurnal penyesuaiannya tidak dapat dibukukan.");
            }

            $amount = round((float) $data['amount'], 2);
            $accrual = $data['kind'] === 'ACCRUAL';
            if (! $accrual) {
                self::assertPrepaidCovers($amount, $end);
            }
            $reference = DocumentNumber::next(JournalEntry::class, 'reference_id', 'AJP', $end);

            $entry = (new JournalDraft())
                ->debit($data['account_code'], $amount, $data['description'])
                ->credit($accrual ? self::ACCRUED : self::PREPAID, $amount, $accrual ? 'Beban yang masih harus dibayar' : 'Beban dibayar di muka yang terpakai')
                ->post($this->engine, self::ENTRY, $reference, "AJP {$data['period']}: {$data['description']}", $end);

            if (! ($data['auto_reverse'] ?? false)) {
                return [$entry];
            }

            $reversal = $this->engine->createEntry(
                self::REVERSAL,
                $reference,
                "Pembalik otomatis {$reference}: {$data['description']}",
                $entry->reversedItems('[PEMBALIK AJP] '),
                Carbon::parse($end)->addDay()->toDateString(),
                3,
                $entry->id
            );

            return [$entry, $reversal];
        }, self::ATTEMPTS);
    }

    /**
     * Beban dibayar di muka yang terpakai tidak boleh melebihi saldo 1-1100: per $end maupun per tanggal sesudahnya
     * (pemakaian bulan berikutnya yang sudah dibukukan). Bacaan berkunci, seperti pengaman saldo kas.
     */
    private static function assertPrepaidCovers(float $amount, string $end): void
    {
        $accountId = Account::where('account_code', self::PREPAID)->value('id');
        $daily = DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->where('i.account_id', $accountId)
            ->where('e.status', 'POSTED')
            ->groupBy('e.entry_date')
            ->orderBy('e.entry_date')
            ->selectRaw('e.entry_date as d, SUM(i.debit - i.credit) as net')
            ->sharedLock()
            ->get();

        $atEnd = round((float) $daily->filter(fn ($r) => Carbon::parse($r->d)->toDateString() <= $end)->sum('net'), 2);
        $lowest = $atEnd;
        $running = $atEnd;
        foreach ($daily->filter(fn ($r) => Carbon::parse($r->d)->toDateString() > $end) as $row) {
            $running = round($running + (float) $row->net, 2);
            $lowest = min($lowest, $running);
        }

        if (round($lowest - $amount, 2) < 0) {
            throw new PosRuleException(sprintf(
                'Saldo Beban Dibayar di Muka (1-1100) hanya Rp %s; pemakaian Rp %s akan membuatnya negatif. Catat dulu pembayaran di mukanya.',
                number_format(max(0, $lowest), 0, ',', '.'),
                number_format($amount, 0, ',', '.'),
            ));
        }
    }
}
