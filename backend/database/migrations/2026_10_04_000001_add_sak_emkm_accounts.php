<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Akun SAK EMKM untuk penyusutan aset tetap, jurnal penyesuaian (akrual & dibayar di muka) dan
 * rekonsiliasi bank (biaya administrasi & bunga). Disisipkan bila belum ada (kode dicadangkan SP4).
 */
return new class extends Migration
{
    private const ACCOUNTS = [
        ['account_code' => '1-1100', 'account_name' => 'Beban Dibayar di Muka', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
        ['account_code' => '2-1100', 'account_name' => 'Beban Yang Masih Harus Dibayar', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
        ['account_code' => '4-3000', 'account_name' => 'Pendapatan Bunga Bank', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
        ['account_code' => '6-1011', 'account_name' => 'Beban Penyusutan Aset Tetap', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
        ['account_code' => '6-1012', 'account_name' => 'Beban Administrasi Bank', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
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
        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('journal_items')->whereColumn('journal_items.account_id', 'accounts.id'))
            ->delete();
    }
};
