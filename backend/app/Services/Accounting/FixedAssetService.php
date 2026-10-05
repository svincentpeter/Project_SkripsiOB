<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\FixedAsset;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Register aset tetap: perolehan (Dr 1-3000 / Cr kas atau bank), aset dari saldo awal (tanpa jurnal), aset setoran
 * modal pemilik atau yang terlewat dari saldo awal (Dr 1-3000 / Cr 1-3999 akumulasi awal / Cr 3-1000 nilai buku),
 * dan pembatalan aset salah input (jurnal cermin perolehan + pembalikan penyusutannya per bulan penyusutan).
 */
class FixedAssetService
{
    public const ASSET_ACCOUNT = '1-3000';
    public const ACCUMULATED_ACCOUNT = '1-3999';
    public const ACQUISITION = 'FIXED_ASSET_ACQUISITION';
    public const VOID = 'FIXED_ASSET_VOID';

    /** Percobaan ulang saat deadlock/lock wait timeout, mis. X 1-3999 → nomor JRN vs saldo awal (X 3-1000 → JRN → FK S 1-3999). */
    private const ATTEMPTS = 3;

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /** Satu perubahan register/penyusutan pada satu waktu: kunci baris akun akumulasi penyusutan. */
    public static function lockRegister(): void
    {
        Account::where('account_code', self::ACCUMULATED_ACCOUNT)->lockForUpdate()->first();
    }

    /**
     * Jurnal tunai menyentuh laci (1-1000): kunci S baris akunnya sebelum kunci lain, seperti
     * CashSessionService::requireOpen(). Tanpa ini insert journal_items (FK S 1-1000) terjadi setelah kunci nomor
     * JRN dan bisa bersiklus dengan approve() shift (X 1-1000 → nomor JRN).
     */
    private static function lockDrawer(string $funding): void
    {
        if ($funding === 'TUNAI') {
            Account::where('account_code', '1-1000')->sharedLock()->first();
        }
    }

    /**
     * @param  array{name: string, category: string, acquisition_date: string, acquisition_cost: float|int|string, residual_value?: float|int|string|null, useful_life_months: int|string, funding: string, depreciation_start?: ?string, opening_accumulated_depreciation?: float|int|string|null, notes?: ?string}  $data
     * @return array{asset: FixedAsset, journal: ?JournalEntry}
     */
    public function create(array $data, User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            self::lockDrawer($data['funding']);
            self::lockRegister();
            $opening = in_array($data['funding'], FixedAsset::CARRIED_OVER, true);
            $code = DocumentNumber::next(FixedAsset::class, 'code', 'AT', $data['acquisition_date']);

            $asset = FixedAsset::create([
                'code' => $code,
                'name' => $data['name'],
                'category' => $data['category'],
                'acquisition_date' => $data['acquisition_date'],
                'acquisition_cost' => round((float) $data['acquisition_cost'], 2),
                'residual_value' => round((float) ($data['residual_value'] ?? 0), 2),
                'useful_life_months' => (int) $data['useful_life_months'],
                'depreciation_start' => $opening ? $data['depreciation_start'] : substr($data['acquisition_date'], 0, 7),
                'opening_accumulated_depreciation' => $opening ? round((float) ($data['opening_accumulated_depreciation'] ?? 0), 2) : 0,
                'funding' => $data['funding'],
                'status' => 'ACTIVE',
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
                'branch_id' => 3,
            ]);

            $journal = null;
            $cost = (float) $asset->acquisition_cost;
            if ($data['funding'] === 'MODAL') {
                // Tanpa uang keluar: nilai buku aset menambah modal pemilik (akun penyeimbang saldo awal).
                $accumulated = (float) $asset->opening_accumulated_depreciation;
                $draft = (new JournalDraft())->debit(self::ASSET_ACCOUNT, $cost, "Perolehan {$code} {$asset->name}");
                if ($accumulated > 0) {
                    $draft->credit(self::ACCUMULATED_ACCOUNT, $accumulated, "Akumulasi penyusutan awal {$code}");
                }
                if (round($cost - $accumulated, 2) > 0) {
                    $draft->credit(OpeningBalanceService::CAPITAL, round($cost - $accumulated, 2), "Setoran aset {$code} oleh pemilik");
                }
                $journal = $draft->post($this->engine, self::ACQUISITION, $code, "Setoran modal aset tetap {$code}: {$asset->name}", $data['acquisition_date']);
            } elseif (! $opening) {
                $journal = (new JournalDraft())
                    ->debit(self::ASSET_ACCOUNT, $cost, "Perolehan {$code} {$asset->name}")
                    ->credit($data['funding'] === 'TUNAI' ? '1-1000' : '1-1001', $cost, "Pembayaran aset {$code}")
                    ->post($this->engine, self::ACQUISITION, $code, "Perolehan aset tetap {$code}: {$asset->name}", $data['acquisition_date']);
            }
            if ($journal !== null) {
                $asset->update(['journal_entry_number' => $journal->entry_number]);
            }

            return ['asset' => $asset->fresh(), 'journal' => $journal];
        }, self::ATTEMPTS);
    }

    /**
     * Batalkan aset salah input. Bila sudah disusutkan, penyusutannya dibalik per bulan (Dr 1-3999 / Cr 6-1011, satu
     * jurnal FIXED_ASSET_VOID per bulan penyusutan, bertanggal akhir bulan itu), hanya bila setiap bulan itu masih
     * terbuka; jurnal cermin perolehan bertanggal hari ini. Baris fixed_asset_depreciations tetap disimpan (riwayat):
     * register & penyusutan tertunda hanya membaca aset ACTIVE, dan CALK menghitung akumulasi aset VOID dari saldo
     * awalnya saja, sehingga keduanya tetap cocok dengan buku besar di setiap tanggal.
     *
     * Aset saldo awal tidak punya jurnal perolehan. Dengan $correctLedger nilainya juga dikeluarkan dari buku besar hari
     * ini (Dr 3-1000 nilai buku / Dr 1-3999 akumulasi awal / Cr 1-3000 harga perolehan): saldo awalnya terlalu besar.
     * Tanpa itu hanya statusnya yang berubah (entri register ganda).
     *
     * @return array{asset: FixedAsset, journals: list<JournalEntry>}
     */
    public function void(int $id, string $reason, User $user, bool $correctLedger = false): array
    {
        return DB::transaction(function () use ($id, $reason, $user, $correctLedger) {
            // funding tidak pernah berubah, jadi dibaca tanpa kunci untuk menentukan kunci laci lebih dulu.
            // Bacaan ini menetapkan snapshot REPEATABLE READ sebelum kunci diperoleh: setiap keputusan di bawah kunci
            // wajib bacaan berkunci (current read), agar penyusutan yang commit selama menunggu kunci tetap terlihat.
            self::lockDrawer((string) FixedAsset::whereKey($id)->value('funding'));
            self::lockRegister();
            $asset = FixedAsset::lockForUpdate()->findOrFail($id);

            if ($asset->status === 'VOID') {
                throw new PosRuleException("Aset {$asset->code} sudah dibatalkan.");
            }
            if ($correctLedger && $asset->funding !== 'OPENING') {
                throw new PosRuleException('Koreksi buku besar hanya untuk aset dari saldo awal; aset lain dibatalkan lewat jurnal cermin perolehannya.');
            }
            // Kunci baris penyusutan & tanggal kunci periode (bacaan berkunci): penutupan bulan mengambil X 1-3999 tepat
            // sesudah X 3-2000, jadi lockRegister() di atas sudah menyerialkan pembatalan ini dengan tutup buku.
            $depreciations = $asset->depreciations()->lockForUpdate()->orderBy('period')->get();
            $lock = $depreciations->isEmpty() ? null : PeriodLock::lockDate(locking: true);
            $closed = $depreciations->first(fn ($d) => $lock !== null && DepreciationService::endOf($d->period) <= $lock);
            if ($closed !== null) {
                throw new PosRuleException("Aset {$asset->code} sudah disusutkan pada periode {$closed->period} yang sudah ditutup; pembatalan hanya bila semua bulan penyusutannya masih terbuka. Buka kembali periode itu lebih dulu.");
            }

            // Urut bulan naik, sebelum cermin perolehan, agar nomor JRN mengikuti urutan tanggal.
            $journals = [];
            foreach ($depreciations as $d) {
                if ((float) $d->amount <= 0) {
                    continue;
                }
                $journals[] = (new JournalDraft())
                    ->debit(self::ACCUMULATED_ACCOUNT, (float) $d->amount, "[BATAL] Akumulasi penyusutan {$asset->code} {$d->period}")
                    ->credit(DepreciationService::EXPENSE_ACCOUNT, (float) $d->amount, "[BATAL] Penyusutan {$asset->code} {$d->period}")
                    ->post($this->engine, self::VOID, $asset->code, "Pembalikan penyusutan {$d->period} aset tetap {$asset->code} {$asset->name}: {$reason}", DepreciationService::endOf($d->period));
            }

            if ($asset->journal_entry_number !== null) {
                $original = JournalEntry::where('entry_number', $asset->journal_entry_number)->firstOrFail();
                $journals[] = $this->engine->createEntry(
                    self::VOID,
                    $asset->code,
                    "Pembatalan aset tetap {$asset->code}: {$reason}",
                    $original->reversedItems('[BATAL] '),
                    now()->toDateString(),
                    3,
                    $original->id
                );
            }

            if ($correctLedger) {
                $cost = (float) $asset->acquisition_cost;
                $accumulated = (float) $asset->opening_accumulated_depreciation;
                $draft = new JournalDraft();
                if (round($cost - $accumulated, 2) > 0) {
                    $draft->debit(OpeningBalanceService::CAPITAL, round($cost - $accumulated, 2), "[KOREKSI] Saldo awal aset {$asset->code}");
                }
                if ($accumulated > 0) {
                    $draft->debit(self::ACCUMULATED_ACCOUNT, $accumulated, "[KOREKSI] Akumulasi penyusutan awal {$asset->code}");
                }
                $journals[] = $draft->credit(self::ASSET_ACCOUNT, $cost, "[KOREKSI] Harga perolehan {$asset->code}")
                    ->post($this->engine, self::VOID, $asset->code, "Koreksi saldo awal aset tetap {$asset->code} {$asset->name}: {$reason}", now()->toDateString());
            }

            $asset->update(['status' => 'VOID', 'void_reason' => $reason, 'voided_by' => $user->id, 'voided_at' => now()]);

            return ['asset' => $asset->fresh(), 'journals' => $journals];
        }, self::ATTEMPTS);
    }

    /**
     * Total register aset aktif dibanding saldo buku besar 1-3000 / 1-3999.
     *
     * @param  Collection<int, FixedAsset>  $assets
     */
    public static function summary(Collection $assets): array
    {
        $active = $assets->where('status', 'ACTIVE');
        $cost = round($active->sum(fn (FixedAsset $a) => (float) $a->acquisition_cost), 2);
        $accumulated = round($active->sum(fn (FixedAsset $a) => $a->accumulatedDepreciation()), 2);

        $balances = LedgerBalances::forRange(null, null)->keyBy(fn (AccountBalance $b) => $b->account->account_code);
        $ledgerCost = $balances[self::ASSET_ACCOUNT]->signed('DEBIT');
        $ledgerAccumulated = $balances[self::ACCUMULATED_ACCOUNT]->signed('CREDIT');

        return [
            'total_cost' => $cost,
            'total_accumulated' => $accumulated,
            'total_book_value' => round($cost - $accumulated, 2),
            'ledger_cost' => $ledgerCost,
            'ledger_accumulated' => $ledgerAccumulated,
            'difference_cost' => round($cost - $ledgerCost, 2),
            'difference_accumulated' => round($accumulated - $ledgerAccumulated, 2),
        ];
    }
}
