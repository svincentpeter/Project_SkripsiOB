<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * DP booking, BON dan surcharge EDC dihapus dari POS. Akunnya tetap ada karena jurnal lama merujuk ke sana,
 * tetapi dinonaktifkan agar tidak muncul di pilihan akun. 6-1009 tetap aktif (MDR QRIS).
 * Akun yang belum ada disisipkan dalam keadaan nonaktif, sehingga seeder COA (yang hanya menyisipkan akun
 * yang belum ada) tidak mengaktifkannya lagi pada database baru.
 */
return new class extends Migration
{
    private const ACCOUNTS = [
        ['account_code' => '1-1002', 'account_name' => 'Piutang Dagang (AR)', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
        ['account_code' => '2-1004', 'account_name' => 'Uang Muka Pelanggan (DP Booking)', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
        ['account_code' => '4-2000', 'account_name' => 'Pendapatan Surcharge EDC', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
    ];

    public function up(): void
    {
        $existing = DB::table('accounts')->pluck('account_code')->all();
        foreach (self::ACCOUNTS as $account) {
            if (! in_array($account['account_code'], $existing, true)) {
                DB::table('accounts')->insert($account + ['is_active' => false, 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->update(['is_active' => false, 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->update(['is_active' => true, 'updated_at' => now()]);
    }
};
