<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\CashSession;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Shift kasir untuk satu laci. Laci = akun 1-1000, jadi hanya uang tunai yang masuk hitungan.
 * Kas seharusnya = kas awal + Σ mutasi 1-1000 yang dibukukan selama shift (penjualan tunai, biaya dari laci,
 * void, pembelian tunai, setor bank, prive, modal, retur tunai, ...). Selisih wajib diberi alasan; pemilik
 * menyetujui dan saat itu selisihnya dijurnal ke 6-1010 sehingga saldo 1-1000 sama dengan kas fisik.
 */
class CashSessionService
{
    public const CASH = '1-1000';

    public const VARIANCE_ACCOUNT = '6-1010';

    public const REFERENCE_TYPE = 'CASH_SESSION_VARIANCE';

    /**
     * Percobaan ulang saat deadlock (1213). Siklus yang tersisa melewati antrean kunci baris 1-1000, mis. checkout
     * (S 1-1000, menunggu nomor JRN) ↔ biaya tunai (memegang nomor JRN, menunggu S 1-1000 di belakang X yang antre).
     */
    private const ATTEMPTS = 3;

    /**
     * Label baris ringkasan per jenis jurnal. Jenis lain tetap dihitung dan tampil dengan kodenya;
     * sub-proyek berikutnya menambahkan labelnya di sini.
     */
    public const LINE_LABELS = [
        'POS_SALE' => 'Penjualan tunai',
        'POS_SALE_VOID' => 'Void nota tunai',
        'EXPENSE' => 'Biaya dibayar dari laci',
        'VOID_EXPENSE' => 'Pembatalan biaya tunai',
        'PURCHASE' => 'Pembelian barang tunai',
        'DEBT_PAYMENT' => 'Bayar hutang supplier dari laci',
        'CASH_DEPOSIT' => 'Setor kas ke bank',
        'OWNER_DRAWING' => 'Prive pemilik',
        'CAPITAL_INJECTION' => 'Setoran modal',
        'MANUAL_ADJUSTMENT' => 'Jurnal penyesuaian',
        'MANUAL_REVERSAL' => 'Pembalik jurnal penyesuaian',
        'ACCOUNT_OPENING' => 'Saldo awal kas',
        'SALES_RETURN' => 'Retur penjualan (refund tunai)',
        'PURCHASE_RETURN' => 'Retur pembelian (refund tunai supplier)',
        'GOODS_RECEIPT_CANCEL' => 'Batal penerimaan barang (refund tunai)',
        'FIXED_ASSET_ACQUISITION' => 'Pembelian aset tetap tunai',
        'FIXED_ASSET_VOID' => 'Pembatalan pembelian aset tetap tunai',
    ];

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * Shift yang sedang dibuka; 422 bila belum ada. Dipakai checkout tunai (dan retur tunai), di dalam transaksi.
     * Kunci S baris akun 1-1000 lebih dulu: open/close/approve mengambil kunci X baris yang sama sebagai langkah
     * pertama, jadi close() menunggu sampai penjualan tunai commit (uang selalu masuk jendela shift) dan tidak ada
     * siklus dengan kunci S FK yang diambil insert journal_items 1-1000. Lalu kunci S per primary key + cek ulang
     * status. Jangan mengunci lewat predikat status: next-key lock pada indeks status bentrok dengan approve().
     */
    public static function requireOpen(): CashSession
    {
        Account::where('account_code', self::CASH)->sharedLock()->first();
        $open = self::current();
        $session = $open ? CashSession::whereKey($open->id)->sharedLock()->first() : null;
        if ($session === null || $session->status !== CashSession::OPEN) {
            throw new PosRuleException('Shift kasir belum dibuka. Buka shift dan hitung kas awal laci sebelum menerima atau mengeluarkan uang tunai.');
        }

        return $session;
    }

    public static function current(): ?CashSession
    {
        return CashSession::where('status', CashSession::OPEN)->first();
    }

    /** Saldo buku akun 1-1000 dari seluruh jurnal POSTED. */
    public static function ledgerBalance(): float
    {
        return round((float) self::cashItems()->sum(DB::raw('journal_items.debit - journal_items.credit')), 2);
    }

    /** Isi laci menurut buku: saldo 1-1000 + selisih shift yang belum disetujui (belum dijurnal). */
    public static function bookBalance(): float
    {
        return round(self::ledgerBalance() + self::pendingAdjustment(), 2);
    }

    /**
     * Selisih shift yang menunggu persetujuan OWNER (belum dijurnal ke 1-1000). Current read (sharedLock): snapshot
     * transaksi pemanggil bisa lebih tua dari close/approve yang baru di-commit, sedangkan saldo jurnal dibaca terkini.
     */
    public static function pendingAdjustment(): float
    {
        return round(CashSession::where('status', CashSession::PENDING)->sharedLock()->get()
            ->sum(fn (CashSession $s) => (float) $s->adjustment()), 2);
    }

    /**
     * Rincian kas seharusnya per jenis jurnal dalam jendela shift. Publik agar retur tunai (SP3) dan laporan
     * harian (SP5) memakai rumus yang sama.
     *
     * @return array{lines: list<array{reference_type: string, label: string, amount: float, count: int}>, cash_in: float, cash_out: float, expected_cash: float}
     */
    public static function summary(CashSession $session): array
    {
        $rows = self::cashItems()
            ->where('e.reference_type', '!=', self::REFERENCE_TYPE)
            ->where('e.id', '>', $session->from_entry_id)
            ->when($session->to_entry_id !== null, fn (Builder $q) => $q->where('e.id', '<=', $session->to_entry_id))
            ->groupBy('e.reference_type')
            ->orderBy('e.reference_type')
            ->selectRaw('e.reference_type, SUM(journal_items.debit - journal_items.credit) AS amount, COUNT(DISTINCT e.id) AS entries')
            ->get();

        $lines = $rows->map(fn ($row) => [
            'reference_type' => (string) $row->reference_type,
            'label' => self::LINE_LABELS[$row->reference_type] ?? (string) $row->reference_type,
            'amount' => round((float) $row->amount, 2),
            'count' => (int) $row->entries,
        ])->values()->all();

        $amounts = array_column($lines, 'amount');
        $in = round(array_sum(array_filter($amounts, fn (float $a) => $a > 0)), 2);
        $out = round(-array_sum(array_filter($amounts, fn (float $a) => $a < 0)), 2);

        return [
            'lines' => $lines,
            'cash_in' => $in,
            'cash_out' => $out,
            'expected_cash' => round((float) $session->opening_float + $in - $out, 2),
        ];
    }

    public function open(User $user, float $openingFloat, ?string $note): CashSession
    {
        return DB::transaction(function () use ($user, $openingFloat, $note) {
            self::serialize();
            if (self::current() !== null) {
                throw new PosRuleException('Masih ada shift kasir yang terbuka. Tutup shift itu sebelum membuka shift baru.');
            }

            $book = self::bookBalance();
            $float = round($openingFloat, 2);
            $note = trim((string) $note);
            if (abs($float - $book) >= 0.005 && $note === '') {
                throw new PosRuleException('Kas awal berbeda dari saldo buku laci ('.self::rupiah($book).'). Isi keterangan selisih kas awal.');
            }

            return CashSession::create([
                'user_id' => $user->id,
                'opened_at' => now(),
                'opening_float' => $float,
                'book_opening' => $book,
                'opening_note' => $note === '' ? null : $note,
                // ponytail: jendela shift memakai id jurnal; jurnal yang id-nya dibagikan sebelum tutup tetapi
                // commit sesudahnya tidak masuk shift mana pun (tetap ada di saldo buku shift berikutnya).
                'from_entry_id' => (int) JournalEntry::max('id'),
                'status' => CashSession::OPEN,
                'branch_id' => 3,
            ]);
        }, self::ATTEMPTS);
    }

    public function close(int $id, User $user, float $countedCash, ?string $reason): CashSession
    {
        return DB::transaction(function () use ($id, $user, $countedCash, $reason) {
            self::serialize();
            $session = CashSession::lockForUpdate()->findOrFail($id);
            if ($session->status !== CashSession::OPEN) {
                throw new PosRuleException('Shift ini sudah ditutup.');
            }

            $session->to_entry_id = (int) JournalEntry::max('id');
            $expected = self::summary($session)['expected_cash'];
            $counted = round($countedCash, 2);
            $variance = round($counted - $expected, 2);
            $reason = trim((string) $reason);
            if (abs($variance) >= 0.005 && $reason === '') {
                throw new PosRuleException('Kas fisik berbeda '.self::rupiah($variance).' dari kas seharusnya ('.self::rupiah($expected).'). Alasan selisih wajib diisi.');
            }

            $session->fill([
                'closed_at' => now(),
                'closed_by' => $user->id,
                'expected_cash' => $expected,
                'counted_cash' => $counted,
                'variance' => $variance,
                'variance_reason' => $reason === '' ? null : $reason,
                'status' => CashSession::PENDING,
            ])->save();

            return $session;
        }, self::ATTEMPTS);
    }

    /**
     * @return array{session: CashSession, journal: ?JournalEntry}
     */
    public function approve(int $id, User $approver): array
    {
        return DB::transaction(function () use ($id, $approver) {
            self::serialize();
            $session = CashSession::with('user')->lockForUpdate()->findOrFail($id);
            if ($session->status !== CashSession::PENDING) {
                throw new PosRuleException('Hanya shift yang menunggu persetujuan yang dapat disetujui.');
            }
            // Pembuka dan penutup (yang menghitung kas fisik) tidak boleh menyetujui selisihnya sendiri.
            if ($approver->role !== 'OWNER' && in_array((int) $approver->id, [(int) $session->user_id, (int) $session->closed_by], true)) {
                throw new PosRuleException('Shift yang Anda buka atau tutup sendiri harus disetujui pemilik.');
            }

            $amount = (float) $session->adjustment();
            $why = Str::limit($session->variance_reason ?? $session->opening_note ?? 'selisih kas', 180);
            $draft = new JournalDraft();
            if ($amount > 0) {
                $draft->debit(self::CASH, $amount, "Kas lebih shift #{$session->id}")
                    ->credit(self::VARIANCE_ACCOUNT, $amount, "Kas lebih: {$why}");
            } elseif ($amount < 0) {
                $draft->debit(self::VARIANCE_ACCOUNT, -$amount, "Kas kurang: {$why}")
                    ->credit(self::CASH, -$amount, "Kas kurang shift #{$session->id}");
            }

            // Dijurnal pada tanggal persetujuan: hari ini tidak pernah berada di periode yang sudah ditutup.
            $journal = $draft->isEmpty() ? null : $draft->post(
                $this->engine,
                self::REFERENCE_TYPE,
                'SHIFT-'.$session->id,
                "Selisih kas shift kasir #{$session->id} ({$session->user?->name})",
                now()->toDateString()
            );

            $session->update([
                'status' => CashSession::CLOSED,
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'journal_entry_id' => $journal?->id,
            ]);

            return ['session' => $session, 'journal' => $journal];
        }, self::ATTEMPTS);
    }

    /** Baris jurnal POSTED pada akun kas laci. */
    private static function cashItems(): Builder
    {
        return JournalItem::query()
            ->join('journal_entries as e', 'e.id', '=', 'journal_items.journal_entry_id')
            ->join('accounts as a', 'a.id', '=', 'journal_items.account_id')
            ->where('a.account_code', self::CASH)
            ->where('e.status', 'POSTED');
    }

    /** Buka, tutup dan setujui shift berjalan satu per satu (satu laci). */
    private static function serialize(): void
    {
        Account::where('account_code', self::CASH)->lockForUpdate()->first();
    }

    private static function rupiah(float $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
