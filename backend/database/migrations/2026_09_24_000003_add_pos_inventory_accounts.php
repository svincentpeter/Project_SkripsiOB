<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Akun COA yang dibutuhkan siklus POS & inventori server. Ditambahkan lewat migrasi agar
 * database yang sudah berjalan ikut mendapatkannya tanpa menjalankan ulang seeder.
 */
return new class extends Migration
{
    private const ACCOUNTS = [
        ['account_code' => '2-1004', 'account_name' => 'Uang Muka Pelanggan (DP Booking)', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
        ['account_code' => '4-2000', 'account_name' => 'Pendapatan Surcharge EDC', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
        ['account_code' => '5-2000', 'account_name' => 'Selisih Persediaan (Opname)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
        ['account_code' => '6-1009', 'account_name' => 'Beban MDR QRIS & EDC', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
    ];

    public function up(): void
    {
        $existing = DB::table('accounts')->pluck('account_code')->all();
        foreach (self::ACCOUNTS as $account) {
            if (! in_array($account['account_code'], $existing, true)) {
                DB::table('accounts')->insert($account + ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        // Akun yang sudah dipakai jurnal tidak boleh dihapus; hanya hapus yang belum pernah dipakai.
        $codes = array_column(self::ACCOUNTS, 'account_code');
        DB::table('accounts')
            ->whereIn('account_code', $codes)
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('journal_items')->whereColumn('journal_items.account_id', 'accounts.id'))
            ->delete();
    }
};
