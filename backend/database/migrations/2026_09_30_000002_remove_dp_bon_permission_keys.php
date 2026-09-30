<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Izin booking_dp dan bon_receivable tidak dipakai lagi (DP booking dan BON dihapus dari POS).
 */
return new class extends Migration
{
    private const KEYS = ['booking_dp', 'bon_receivable'];

    /** Default lama saat kunci masih ada: Kasir boleh, Gudang tidak. */
    private const OLD_DEFAULTS = ['KASIR' => true, 'GUDANG' => false];

    public function up(): void
    {
        DB::table('role_permissions')->whereIn('permission_key', self::KEYS)->delete();
    }

    public function down(): void
    {
        foreach (self::OLD_DEFAULTS as $role => $allowed) {
            foreach (self::KEYS as $key) {
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
};
