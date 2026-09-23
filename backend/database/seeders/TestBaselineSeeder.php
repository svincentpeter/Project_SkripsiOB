<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Data minimum yang diasumsikan test fitur: bagan akun SAK EMKM dan izin per peran.
 * Kedua seeder idempoten, sehingga akun/izin baru ikut masuk ke DB test yang sudah ada.
 */
class TestBaselineSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AccountCoaSeeder::class);
        $this->call(RolePermissionSeeder::class);
    }
}
