<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Retur penjualan dibukukan ke 4-9100 (kontra pendapatan, saldo normal debit). Izin baru sales_return (kasir) dan
 * purchase_return (gudang) disisipkan bila belum ada, tanpa menimpa pilihan Owner.
 */
return new class extends Migration
{
    private const DEFAULTS = [
        'sales_return' => ['KASIR' => true, 'GUDANG' => false],
        'purchase_return' => ['KASIR' => false, 'GUDANG' => true],
    ];

    public function up(): void
    {
        if (! DB::table('accounts')->where('account_code', '4-9100')->exists()) {
            DB::table('accounts')->insert([
                'account_code' => '4-9100',
                'account_name' => 'Retur Penjualan',
                'account_type' => 'REVENUE',
                'normal_balance' => 'DEBIT',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (self::DEFAULTS as $key => $roles) {
            foreach ($roles as $role => $allowed) {
                $exists = DB::table('role_permissions')->where('role', $role)->where('permission_key', $key)->exists();
                if (! $exists) {
                    DB::table('role_permissions')->insert([
                        'role' => $role,
                        'permission_key' => $key,
                        'allowed' => $allowed,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        DB::table('role_permissions')->whereIn('permission_key', array_keys(self::DEFAULTS))->delete();
        DB::table('accounts')
            ->where('account_code', '4-9100')
            ->whereNotExists(fn ($q) => $q->from('journal_items')->whereColumn('journal_items.account_id', 'accounts.id'))
            ->delete();
    }
};
