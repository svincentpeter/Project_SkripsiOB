<?php

namespace Database\Seeders;

use App\Models\RolePermission;
use App\Support\Permissions;
use Illuminate\Database\Seeder;

/**
 * Mengisi izin default yang belum ada tanpa menimpa pilihan Owner.
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Permissions::CONFIGURABLE_ROLES as $role) {
            foreach (Permissions::KEYS as $key) {
                RolePermission::firstOrCreate(
                    ['role' => $role, 'permission_key' => $key],
                    ['allowed' => in_array($key, Permissions::DEFAULTS[$role], true)]
                );
            }
        }
    }
}
