<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\Permissions;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'username', 'email', 'password', 'role', 'phone', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const BRANCH_NAME = 'Cabang 3 Magelang';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function hasPermission(string $key): bool
    {
        return $this->permissionMap()[$key] ?? false;
    }

    /**
     * Owner selalu diizinkan; peran lain hanya yang tercatat allowed; akun nonaktif atau
     * peran tak dikenal tidak punya izin apa pun.
     *
     * @return array<string, bool>
     */
    public function permissionMap(): array
    {
        if (! $this->is_active || ! in_array($this->role, Permissions::ROLES, true)) {
            return array_fill_keys(Permissions::KEYS, false);
        }

        if ($this->role === 'OWNER') {
            return array_fill_keys(Permissions::KEYS, true);
        }

        $allowed = RolePermission::where('role', $this->role)
            ->where('allowed', true)
            ->pluck('permission_key')
            ->all();

        return array_combine(
            Permissions::KEYS,
            array_map(fn (string $key) => in_array($key, $allowed, true), Permissions::KEYS)
        );
    }

    public function toAuthArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'phone' => $this->phone,
            'branch_name' => self::BRANCH_NAME,
            'is_active' => $this->is_active,
            'permissions' => $this->permissionMap(),
        ];
    }
}
