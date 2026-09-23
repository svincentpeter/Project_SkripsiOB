<?php

namespace App\Models;

use App\Support\Permissions;
use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $fillable = ['role', 'permission_key', 'allowed'];

    protected function casts(): array
    {
        return ['allowed' => 'boolean'];
    }

    /**
     * Matriks izin lengkap untuk peran yang dapat diatur Owner.
     *
     * @return array<string, array<string, bool>>
     */
    public static function configMatrix(): array
    {
        $allowed = static::whereIn('role', Permissions::CONFIGURABLE_ROLES)
            ->where('allowed', true)
            ->get(['role', 'permission_key']);

        $matrix = [];
        foreach (Permissions::CONFIGURABLE_ROLES as $role) {
            $keys = $allowed->where('role', $role)->pluck('permission_key')->all();
            foreach (Permissions::KEYS as $key) {
                $matrix[$role][$key] = in_array($key, $keys, true);
            }
        }

        return $matrix;
    }
}
