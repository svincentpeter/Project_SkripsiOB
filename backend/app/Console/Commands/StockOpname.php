<?php

namespace App\Console\Commands;

use App\Services\Inventory\StockExcelImportService;
use App\Services\Inventory\StockOpnameCommitService;
use Illuminate\Console\Command;
use RuntimeException;

class StockOpname extends Command
{
    protected $signature = 'stock:opname
        {--file= : Path berkas Excel stok}
        {--period= : Periode tujuan, format YYYY-MM}
        {--qty-column=H : H = sisa akhir bulan, G = stok awal bulan}
        {--dry-run : Hanya tampilkan ringkasan, tidak menulis ke database}
        {--force : Lewati pengaman penjualan periode baru}';

    protected $description = 'Parse berkas stok Excel dan tulis stok awal periode baru.';

    public function handle(StockExcelImportService $parser, StockOpnameCommitService $committer): int
    {
        $file = (string) $this->option('file');
        $period = (string) $this->option('period');

        if ($file === '' || ! is_file($file)) {
            $this->error("Berkas tidak ditemukan: {$file}");

            return self::FAILURE;
        }

        if (! preg_match('/^\d{4}-\d{2}$/', $period)) {
            $this->error('Periode wajib diisi dengan format YYYY-MM, contoh: --period=2026-09');

            return self::FAILURE;
        }

        $staging = $parser->processExcelToStaging($file, null, (string) $this->option('qty-column'));
        $meta = $staging['meta'];

        $this->info("Sumber   : {$meta['source']} → periode {$period}");
        $this->info("Terbaca  : {$meta['rows_read']} baris → {$meta['total_products']} produk, {$meta['total_batches']} batch");
        $this->info("Kuantitas: awal {$meta['total_opening_qty']} → dipakai {$meta['total_stock_qty']} (kolom {$meta['qty_column']})");
        $this->line("Catatan diabaikan      : {$meta['rows_note']}");
        $this->line("Tanpa harga jual       : {$meta['products_without_price']}");
        $this->line("Tanpa modal            : {$meta['products_without_cost']}");

        if ($meta['rows_unresolved'] > 0) {
            $this->warn("Baris tak terselesaikan: {$meta['rows_unresolved']}");
            foreach ($staging['unresolved'] as $u) {
                $this->warn("  {$u['sheet']}!{$u['row']}  {$u['name']}  ({$u['reason']}, {$u['qty']} unit)");
            }
        }

        if ($this->option('dry-run')) {
            $this->comment('Mode dry-run: tidak ada yang ditulis ke database.');

            return self::SUCCESS;
        }

        if ($meta['rows_unresolved'] > 0 && ! $this->option('force')) {
            $this->error('Masih ada baris tak terselesaikan. Bereskan dulu, atau jalankan dengan --force.');

            return self::FAILURE;
        }

        try {
            $hasil = $committer->commit($staging, $period, ['force' => (bool) $this->option('force')]);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Selesai. Baru: {$hasil['created']}, diperbarui: {$hasil['updated']}, "
            ."dinolkan: {$hasil['zeroed']}, dinonaktifkan: {$hasil['deactivated']}, "
            ."batch: {$hasil['batches_created']}, kartu stok: {$hasil['movements']}, "
            ."audit harga: {$hasil['price_audits']}");
        $this->comment("Snapshot rollback: {$hasil['snapshot_path']}");

        return self::SUCCESS;
    }
}
