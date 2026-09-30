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
 * Register aset tetap: perolehan (Dr 1-3000 / Cr kas atau bank), aset dari saldo awal (tanpa jurnal),
 * dan pembatalan aset yang belum pernah disusutkan (jurnal cermin).
 */
class FixedAssetService
{
    public const ASSET_ACCOUNT = '1-3000';
    public const ACCUMULATED_ACCOUNT = '1-3999';
    public const ACQUISITION = 'FIXED_ASSET_ACQUISITION';
    public const VOID = 'FIXED_ASSET_VOID';

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
            $opening = $data['funding'] === 'OPENING';
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
            if (! $opening) {
                $cost = (float) $asset->acquisition_cost;
                $journal = (new JournalDraft())
                    ->debit(self::ASSET_ACCOUNT, $cost, "Perolehan {$code} {$asset->name}")
                    ->credit($data['funding'] === 'TUNAI' ? '1-1000' : '1-1001', $cost, "Pembayaran aset {$code}")
                    ->post($this->engine, self::ACQUISITION, $code, "Perolehan aset tetap {$code}: {$asset->name}", $data['acquisition_date']);
                $asset->update(['journal_entry_number' => $journal->entry_number]);
            }

            return ['asset' => $asset->fresh(), 'journal' => $journal];
        });
    }

    /**
     * @return array{asset: FixedAsset, journal: ?JournalEntry}
     */
    public function void(int $id, string $reason, User $user): array
    {
        return DB::transaction(function () use ($id, $reason, $user) {
            // funding tidak pernah berubah, jadi dibaca tanpa kunci untuk menentukan kunci laci lebih dulu.
            self::lockDrawer((string) FixedAsset::whereKey($id)->value('funding'));
            self::lockRegister();
            $asset = FixedAsset::lockForUpdate()->findOrFail($id);

            if ($asset->status === 'VOID') {
                throw new PosRuleException("Aset {$asset->code} sudah dibatalkan.");
            }
            if ($asset->depreciations()->exists()) {
                throw new PosRuleException("Aset {$asset->code} sudah disusutkan; pembatalan hanya untuk aset yang belum pernah disusutkan.");
            }

            $journal = null;
            if ($asset->journal_entry_number !== null) {
                $original = JournalEntry::where('entry_number', $asset->journal_entry_number)->firstOrFail();
                $journal = $this->engine->createEntry(
                    self::VOID,
                    $asset->code,
                    "Pembatalan aset tetap {$asset->code}: {$reason}",
                    $original->reversedItems('[BATAL] '),
                    now()->toDateString(),
                    3,
                    $original->id
                );
            }

            $asset->update(['status' => 'VOID', 'void_reason' => $reason, 'voided_by' => $user->id, 'voided_at' => now()]);

            return ['asset' => $asset->fresh(), 'journal' => $journal];
        });
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
