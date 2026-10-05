<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\AccountingPeriodClosing;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Tutup buku bulanan: seluruh saldo akun pendapatan & beban sampai akhir bulan dipindahkan ke Laba Ditahan,
 * lalu transaksi bertanggal sampai hari itu dikunci. Bulan sebelumnya yang belum ditutup ikut tersapu.
 */
class PeriodClosingService
{
    public const RETAINED_EARNINGS = '3-2000';

    /** Percobaan ulang saat deadlock, mis. X 1-3999 → nomor JRN vs saldo awal (nomor JRN → FK S 1-3999). */
    private const ATTEMPTS = 3;

    public function __construct(
        private readonly AccountingEngine $engine,
        private readonly DepreciationService $depreciation,
    ) {
    }

    public function summary(): array
    {
        return [
            'lock_date' => PeriodLock::lockDate(),
            'suggested_period' => now()->subMonthNoOverflow()->format('Y-m'),
            'closings' => AccountingPeriodClosing::with(['closingEntry', 'closedByUser'])
                ->orderByDesc('end_date')->orderByDesc('id')->limit(24)->get()
                ->map(fn (AccountingPeriodClosing $c) => $c->toApiArray())->values()->all(),
        ];
    }

    public function close(string $period, ?string $notes, User $user): AccountingPeriodClosing
    {
        $end = Carbon::parse($period.'-01')->endOfMonth()->toDateString();
        if ($end >= now()->toDateString()) {
            throw new PosRuleException("Periode {$period} belum berakhir; tutup buku hanya untuk bulan yang sudah lewat.");
        }

        return DB::transaction(function () use ($period, $end, $notes, $user) {
            $this->serialize();
            // Kunci register sebelum bacaan biasa pertama: snapshot REPEATABLE READ lalu dibuat setelah kunci diperoleh,
            // sehingga saldo yang ditutup memuat penyusutan yang commit selama menunggu. Urutan X 3-2000 → X 1-3999 →
            // nomor JRN; tidak ada alur yang memegang 1-3999 lalu meminta 3-2000.
            FixedAssetService::lockRegister();

            $lock = PeriodLock::lockDate();
            if ($lock !== null && $end <= $lock) {
                throw new PosRuleException("Periode {$period} sudah termasuk periode yang ditutup (sampai {$lock}).");
            }

            // Basis akrual SAK EMKM: beban penyusutan sampai bulan ini harus dibukukan sebelum periodenya dikunci.
            $pending = $this->depreciation->pendingTotal($period, true);
            if ($pending > 0) {
                throw new PosRuleException('Penyusutan aset tetap sampai '.$period.' belum dibukukan (Rp '
                    .number_format($pending, 0, ',', '.').'). Jalankan penyusutan periode itu di tab Aset Tetap sebelum tutup buku.');
            }

            $draft = new JournalDraft();
            $netIncome = 0.0;
            foreach (LedgerBalances::forRange(null, $end) as $b) {
                if (! in_array($b->account->account_type, ['REVENUE', 'EXPENSE'], true)) {
                    continue;
                }
                $creditBalance = $b->signed('CREDIT');
                if ($creditBalance > 0) {
                    $draft->debit($b->account->account_code, $creditBalance, "Tutup {$b->account->account_name}");
                } elseif ($creditBalance < 0) {
                    $draft->credit($b->account->account_code, -$creditBalance, "Tutup {$b->account->account_name}");
                }
                $netIncome += $creditBalance;
            }

            $netIncome = round($netIncome, 2);
            if ($netIncome > 0) {
                $draft->credit(self::RETAINED_EARNINGS, $netIncome, "Laba bersih s/d {$end} ke Laba Ditahan");
            } elseif ($netIncome < 0) {
                $draft->debit(self::RETAINED_EARNINGS, -$netIncome, "Rugi bersih s/d {$end} ke Laba Ditahan");
            }

            $entry = $draft->isEmpty()
                ? null
                : $draft->post($this->engine, 'PERIOD_CLOSING', "TUTUP-{$period}", "Jurnal penutup periode {$period}", $end);

            return AccountingPeriodClosing::create([
                'period' => $period,
                'end_date' => $end,
                'closing_entry_id' => $entry?->id,
                'net_income' => $netIncome,
                'notes' => $notes,
                'closed_by' => $user->id,
                'closed_at' => now(),
            ]);
        }, self::ATTEMPTS);
    }

    public function reopen(string $period, string $reason, User $user): AccountingPeriodClosing
    {
        return DB::transaction(function () use ($period, $reason, $user) {
            $this->serialize();

            $closing = AccountingPeriodClosing::whereNull('reopened_at')
                ->orderByDesc('end_date')->orderByDesc('id')
                ->lockForUpdate()->first();

            if ($closing === null || $closing->period !== $period) {
                throw new PosRuleException('Hanya periode terakhir yang ditutup yang dapat dibuka kembali.');
            }

            // Tandai dulu agar kunci periode terbuka sebelum jurnal pembalik (bertanggal akhir periode) dibukukan.
            $closing->update(['reopened_at' => now(), 'reopened_by' => $user->id, 'reopen_reason' => $reason]);

            if ($closing->closingEntry !== null) {
                $reversal = $this->engine->createEntry(
                    'PERIOD_REOPEN',
                    "BUKA-{$period}",
                    "Pembukaan kembali periode {$period}: {$reason}",
                    $closing->closingEntry->reversedItems('[BUKA KEMBALI] '),
                    $closing->end_date->toDateString(),
                    3,
                    $closing->closing_entry_id
                );
                $closing->update(['reopen_entry_id' => $reversal->id]);
            }

            return $closing->fresh(['closingEntry', 'closedByUser']);
        }, self::ATTEMPTS);
    }

    /** Satu tutup/buka buku pada satu waktu: kunci baris akun Laba Ditahan sebelum membaca status periode. */
    private function serialize(): void
    {
        Account::where('account_code', self::RETAINED_EARNINGS)->lockForUpdate()->first();
    }
}
