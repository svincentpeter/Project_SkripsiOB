<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;

/**
 * Data minimum yang diasumsikan test fitur: bagan akun SAK EMKM dan izin per peran.
 */
class TestBaselineSeeder extends Seeder
{
    public function run(): void
    {
        if (Account::count() === 0) {
            $this->call(AccountCoaSeeder::class);
        }

        $this->call(RolePermissionSeeder::class);
    }
}
