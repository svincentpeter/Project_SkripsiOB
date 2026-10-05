<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Nota lama (sebelum sales.user_id) dikaitkan ke penggunanya bila cashier_name cocok dengan tepat satu pengguna.
 * Nama yang dipakai beberapa pengguna dibiarkan null (tetap dicocokkan lewat nama), karena pemiliknya tidak pasti.
 */
return new class extends Migration
{
    public function up(): void
    {
        $unique = DB::table('users')->select('name')->groupBy('name')->havingRaw('COUNT(*) = 1')->pluck('name');
        foreach (DB::table('users')->whereIn('name', $unique)->get(['id', 'name']) as $user) {
            DB::table('sales')->whereNull('user_id')->where('cashier_name', $user->name)->update(['user_id' => $user->id]);
        }
    }

    public function down(): void
    {
        // Tidak dapat membedakan isian migrasi ini dari user_id yang dicatat checkout; dibiarkan.
    }
};
