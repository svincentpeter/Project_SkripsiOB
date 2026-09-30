<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Izin daily_reports (Laporan Harian): Kasir boleh melihat rekap miliknya sendiri, Gudang tidak.
 * Hanya menambah baris yang belum ada, jadi pilihan Owner tidak tertimpa.
 */
return new class extends Migration
{
    private const KEY = 'daily_reports';

    private const DEFAULTS = ['KASIR' => true, 'GUDANG' => false];

    public function up(): void
    {
        foreach (self::DEFAULTS as $role => $allowed) {
            $exists = DB::table('role_permissions')->where('role', $role)->where('permission_key', self::KEY)->exists();
            if (! $exists) {
                DB::table('role_permissions')->insert([
                    'role' => $role,
                    'permission_key' => self::KEY,
                    'allowed' => $allowed,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('role_permissions')->where('permission_key', self::KEY)->delete();
    }
};
