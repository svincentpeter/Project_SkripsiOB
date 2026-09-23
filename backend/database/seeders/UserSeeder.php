<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('SEED_DEFAULT_PASSWORD');
        if (! $password) {
            throw new RuntimeException('SEED_DEFAULT_PASSWORD belum diisi di .env — dibutuhkan untuk membuat akun awal.');
        }

        $accounts = [
            ['username' => 'owner', 'name' => 'Agus Subagyo', 'email' => 'owner@omahban.com', 'role' => 'OWNER', 'phone' => '0822-2786-3969'],
            ['username' => 'kasir', 'name' => 'Kasir OB3', 'email' => 'kasir@omahban.com', 'role' => 'KASIR', 'phone' => '0812-3456-7893'],
            ['username' => 'gudang', 'name' => 'Admin Gudang OB3', 'email' => 'gudang@omahban.com', 'role' => 'GUDANG', 'phone' => '0812-3456-7892'],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                $account + ['password' => $password, 'is_active' => true]
            );
        }

        // Akun bawaan lama berpassword "password123" tidak boleh aktif.
        User::where('email', 'admin@omahban.com')->update(['is_active' => false]);
    }
}
