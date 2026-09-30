<?php

namespace App\Services\Accounting;

use App\Models\BankReconciliation;
use App\Models\FixedAsset;
use App\Models\ProductBatch;
use App\Models\Purchase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Catatan atas Laporan Keuangan (CALK) SAK EMKM untuk satu bulan: informasi entitas, pernyataan kepatuhan,
 * ikhtisar kebijakan akuntansi, dan rincian pos per akhir bulan. Angka dibaca dari jurnal yang sama dengan
 * laporan posisi keuangan, sehingga catatan selalu cocok dengan laporannya. Hanya membaca (tanpa kunci baris).
 */
class CalkReport
{
    /**
     * Data entitas yang dicetak di CALK. Satu-satunya tempat data ini; bentuk hukum dan alamat masih perlu
     * dikonfirmasi pemilik usaha, ubah di sini bila berbeda.
     */
    public const ENTITY = [
        'name' => 'Omah Ban Cabang 3',
        'address' => 'Magelang, Jawa Tengah',
        'activity' => 'Perdagangan eceran ban kendaraan bermotor serta jasa spooring dan balancing.',
        'legal_form' => 'Usaha mikro, kecil dan menengah (UMKM) milik perseorangan.',
        'tax_status' => 'Wajib pajak UMKM, bukan Pengusaha Kena Pajak (non-PKP).',
        'currency' => 'Rupiah (Rp)',
    ];

    public const COMPLIANCE = 'Laporan keuangan '.self::ENTITY['name'].' disusun sesuai dengan Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM) yang diterbitkan oleh Dewan Standar Akuntansi Keuangan Ikatan Akuntan Indonesia.';

    public function __construct(
        private readonly FinancialReportService $reports,
        private readonly BankReconciliationService $bank,
    ) {
    }

    public function build(string $period): array
    {
        $start = $period.'-01';
        $end = Carbon::parse($start)->endOfMonth()->toDateString();
        /** @var Collection<string, AccountBalance> $balances */
        $balances = LedgerBalances::forRange(null, $end)->keyBy(fn (AccountBalance $b) => $b->account->account_code);
        $monthly = LedgerBalances::forRange($start, $end, excludeClosing: true)->keyBy(fn (AccountBalance $b) => $b->account->account_code);

        return [
            'period' => $period,
            'start_date' => $start,
            'end_date' => $end,
            'entity' => self::ENTITY,
            'compliance' => self::COMPLIANCE,
            'policies' => self::policies(),
            'notes' => [
                'cash_and_bank' => $this->cashAndBank($period, $balances),
                'inventory' => $this->inventory($period, self::balance($balances, '1-2000', 'DEBIT')),
                'prepaid_expenses' => ['balance' => self::balance($balances, '1-1100', 'DEBIT')],
                'accrued_expenses' => ['balance' => self::balance($balances, '2-1100', 'CREDIT')],
                'fixed_assets' => $this->fixedAssets($period, $end, $balances, self::balance($monthly, DepreciationService::EXPENSE_ACCOUNT, 'DEBIT')),
                'payables' => $this->payables($end, self::balance($balances, '2-1000', 'CREDIT')),
                'equity' => $this->reports->balanceSheet($end)['equity'],
            ],
        ];
    }

    /** @return list<array{title: string, body: string}> */
    private static function policies(): array
    {
        return [
            ['title' => 'Dasar penyusunan', 'body' => 'Laporan keuangan disusun dengan asumsi kelangsungan usaha dan dasar akrual, menggunakan konsep biaya historis, dan disajikan dalam Rupiah. Laporan keuangan terdiri atas laporan posisi keuangan, laporan laba rugi, dan catatan atas laporan keuangan; laporan perubahan ekuitas dan laporan arus kas disajikan sebagai informasi tambahan.'],
            ['title' => 'Kas dan bank', 'body' => 'Kas terdiri atas kas laci toko (1-1000) dan rekening Bank BCA (1-1001). Saldo bank dicocokkan dengan rekening koran setiap bulan melalui rekonsiliasi bank; biaya administrasi dan bunga bank yang baru diketahui dari rekening koran dibukukan pada tanggal mutasinya.'],
            ['title' => 'Persediaan', 'body' => 'Persediaan ban diukur sebesar biaya perolehan dengan metode masuk pertama keluar pertama (FIFO). Biaya perolehan mencakup harga faktur pemasok termasuk PPN Masukan, karena entitas bukan PKP sehingga PPN tersebut tidak dapat dikreditkan. Selisih hasil stok opname diakui sebagai beban selisih persediaan (5-2000).'],
            ['title' => 'Aset tetap dan penyusutan', 'body' => 'Aset tetap diakui sebesar biaya perolehan dan diukur dengan model biaya tanpa revaluasi. Penyusutan dihitung dengan metode garis lurus atas biaya perolehan dikurangi nilai residu selama umur manfaat dalam bulan, dimulai pada bulan perolehan (bulan penuh), dan dibukukan setiap akhir bulan sebagai Beban Penyusutan Aset Tetap (6-1011) dengan lawan Akumulasi Penyusutan (1-3999). Aset yang dibawa dari saldo awal disusutkan mulai bulan awal penyusutan yang ditetapkan, atas biaya perolehan dikurangi nilai residu dan akumulasi penyusutan sebelum masuk sistem, selama sisa umur manfaatnya.'],
            ['title' => 'Pengakuan pendapatan', 'body' => 'Pendapatan penjualan ban dan jasa bengkel diakui pada saat barang diserahkan atau jasa selesai dan dibayar lunas di kasir (tunai, transfer atau QRIS). Potongan harga dan retur penjualan disajikan sebagai pengurang pendapatan, dan biaya MDR QRIS diakui sebagai beban. Pendapatan bunga bank diakui pada saat dikreditkan ke rekening.'],
            ['title' => 'Beban', 'body' => 'Beban diakui pada saat terjadi (dasar akrual). Pada akhir bulan, beban yang sudah terjadi tetapi belum dibayar dicatat sebagai Beban Yang Masih Harus Dibayar (2-1100) dan dapat dibalik otomatis pada tanggal 1 bulan berikutnya; pembayaran di muka dicatat sebagai Beban Dibayar di Muka (1-1100) dan dibebankan sesuai periode manfaatnya melalui jurnal penyesuaian.'],
            ['title' => 'Pajak', 'body' => 'Entitas bukan Pengusaha Kena Pajak (non-PKP), sehingga tidak memungut PPN atas penjualan. Sebagai wajib pajak UMKM, entitas dikenai PPh Final sebesar 0,5% dari peredaran bruto berdasarkan PP Nomor 55 Tahun 2022. Sistem belum menghitung atau mencadangkan PPh Final secara otomatis; pajak yang disetor dicatat sebagai Beban Pajak & Retribusi Daerah (6-1008) pada saat pembayaran.'],
        ];
    }

    /** @param Collection<string, AccountBalance> $balances */
    private function cashAndBank(string $period, Collection $balances): array
    {
        $lines = array_map(fn (string $code) => [
            'code' => $code,
            'name' => $balances[$code]->account->account_name,
            'amount' => $balances[$code]->signed('DEBIT'),
        ], CashFlowReport::CASH_ACCOUNTS);

        $reconciliation = BankReconciliation::where('period', $period)->exists() ? $this->bank->report($period) : null;

        return [
            'lines' => $lines,
            'total' => round(array_sum(array_column($lines, 'amount')), 2),
            'bank_statement_balance' => $reconciliation['statement_ending_balance'] ?? null,
            'bank_reconciled' => $reconciliation['is_reconciled'] ?? null,
        ];
    }

    /** Rincian FIFO per kategori hanya tersedia untuk posisi saat ini (tidak ada nilai batch historis). */
    private function inventory(string $period, float $ledgerBalance): array
    {
        $current = $period === now()->format('Y-m');
        $breakdown = ! $current ? [] : ProductBatch::query()
            ->join('products as p', 'p.id', '=', 'product_batches.product_id')
            ->leftJoin('product_categories as c', 'c.id', '=', 'p.category_id')
            ->where('product_batches.remaining_qty', '>', 0)
            ->groupBy('c.category_name')
            ->orderBy('c.category_name')
            ->selectRaw("COALESCE(c.category_name, 'Tanpa kategori') as category, SUM(product_batches.remaining_qty) as quantity, SUM(product_batches.remaining_qty * product_batches.batch_cost) as value")
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'quantity' => (int) $row->quantity, 'value' => round((float) $row->value, 2)])
            ->values()->all();

        return [
            'ledger_balance' => $ledgerBalance,
            'method' => 'FIFO',
            'breakdown' => $breakdown,
            'breakdown_as_of' => $current ? now()->toDateString() : null,
        ];
    }

    /** @param Collection<string, AccountBalance> $balances */
    private function fixedAssets(string $period, string $end, Collection $balances, float $expense): array
    {
        $assets = FixedAsset::where('acquisition_date', '<=', $end)
            ->where(fn ($q) => $q->where('status', 'ACTIVE')->orWhere('voided_at', '>', $end.' 23:59:59'))
            ->withSum(['depreciations as posted_through' => fn ($q) => $q->where('period', '<=', $period)], 'amount')
            ->orderBy('code')
            ->get()
            ->map(function (FixedAsset $a) {
                $accumulated = round((float) $a->opening_accumulated_depreciation + (float) ($a->posted_through ?? 0), 2);

                return [
                    'code' => $a->code,
                    'name' => $a->name,
                    'category' => FixedAsset::CATEGORIES[$a->category] ?? $a->category,
                    'acquisition_date' => $a->acquisition_date->toDateString(),
                    'useful_life_months' => $a->useful_life_months,
                    'cost' => (float) $a->acquisition_cost,
                    'accumulated' => $accumulated,
                    'book_value' => round((float) $a->acquisition_cost - $accumulated, 2),
                ];
            })->values()->all();

        $cost = round(array_sum(array_column($assets, 'cost')), 2);
        $accumulated = round(array_sum(array_column($assets, 'accumulated')), 2);

        return [
            'assets' => $assets,
            'total_cost' => $cost,
            'total_accumulated' => $accumulated,
            'total_book_value' => round($cost - $accumulated, 2),
            'ledger_cost' => self::balance($balances, FixedAssetService::ASSET_ACCOUNT, 'DEBIT'),
            'ledger_accumulated' => self::balance($balances, FixedAssetService::ACCUMULATED_ACCOUNT, 'CREDIT'),
            'depreciation_expense' => $expense,
        ];
    }

    /**
     * Hutang pemasok per akhir bulan dari faktur TEMPO dikurangi pembayaran dan pengurangan hutang karena retur/pembatalan
     * (payable_amount) yang bertanggal s/d tanggal itu. Faktur yang dibatalkan sesudah akhir bulan tetap tampil sebagai
     * hutang bulan itu. Selisih terhadap saldo 2-1000 (koreksi manual) ditampilkan sebagai penyesuaian lain agar total sama
     * dengan buku besar.
     */
    private function payables(string $end, float $ledgerBalance): array
    {
        $suppliers = Purchase::where('payment_method', 'TEMPO')
            ->where('purchase_date', '<=', $end)
            ->withSum(['payments as paid_through' => fn ($q) => $q->where('payment_date', '<=', $end)], 'amount')
            ->withSum(['returns as returned_through' => fn ($q) => $q->where('return_date', '<=', $end)], 'payable_amount')
            ->get()
            ->groupBy('supplier_name')
            ->map(fn (Collection $group, string $name) => [
                'supplier_name' => $name,
                'amount' => round($group->sum(fn (Purchase $p) => (float) $p->total_amount - (float) ($p->paid_through ?? 0) - (float) ($p->returned_through ?? 0)), 2),
            ])
            ->filter(fn (array $row) => abs($row['amount']) >= 0.005)
            ->sortBy('supplier_name')
            ->values()->all();

        $subledger = round(array_sum(array_column($suppliers, 'amount')), 2);

        return [
            'suppliers' => $suppliers,
            'subledger_total' => $subledger,
            'other_adjustments' => round($ledgerBalance - $subledger, 2),
            'ledger_balance' => $ledgerBalance,
        ];
    }

    /** @param Collection<string, AccountBalance> $balances */
    private static function balance(Collection $balances, string $code, string $side): float
    {
        return isset($balances[$code]) ? $balances[$code]->signed($side) : 0.0;
    }
}
