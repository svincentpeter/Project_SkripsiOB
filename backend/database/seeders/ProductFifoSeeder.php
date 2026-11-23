<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ProductFifoSeeder extends Seeder
{
    /**
     * Run the database seeds for FIFO batches and complete catalog.
     */
    public function run(): void
    {
        $sqlPath = base_path('../database/seed_fifo_products_complete.sql');

        if (!File::exists($sqlPath)) {
            $this->command->error("File SQL tidak ditemukan di: {$sqlPath}");
            return;
        }

        $sql = File::get($sqlPath);

        // Filter out verification SELECT statement at the end for clean execution
        $statements = explode(';', $sql);

        DB::statement('SET FOREIGN_KEY_CHECKS = 0;');

        foreach ($statements as $statement) {
            $trimmed = trim($statement);
            if (!empty($trimmed) && !str_starts_with(strtoupper($trimmed), 'SELECT')) {
                DB::unprepared($trimmed . ';');
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS = 1;');

        $this->command->info('Katalog produk dan lapisan FIFO batch ban baru berhasil di-seed ke database.');
    }
}
