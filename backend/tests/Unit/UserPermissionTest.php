<?php

namespace Tests\Unit;

use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UserPermissionTest extends TestCase
{
    use DatabaseTransactions;

    private function makeUser(string $role, bool $active = true): User
    {
        return User::factory()->create(['role' => $role, 'is_active' => $active]);
    }

    public function test_owner_has_every_permission(): void
    {
        $owner = $this->makeUser('OWNER');
        $this->assertTrue($owner->hasPermission('accounting_hub'));
        $this->assertTrue($owner->hasPermission('role_settings'));
    }

    public function test_kasir_uses_role_permissions_table(): void
    {
        $kasir = $this->makeUser('KASIR');
        $this->assertTrue($kasir->hasPermission('pos'));
        $this->assertFalse($kasir->hasPermission('accounting_hub'));

        RolePermission::where(['role' => 'KASIR', 'permission_key' => 'pos'])->update(['allowed' => false]);
        $this->assertFalse($kasir->fresh()->hasPermission('pos'));
    }

    public function test_unknown_role_and_unknown_key_are_denied(): void
    {
        $this->assertFalse($this->makeUser('TAMU')->hasPermission('pos'));
        $this->assertFalse($this->makeUser('KASIR')->hasPermission('tidak_ada'));
    }

    public function test_inactive_user_has_no_permission_even_owner(): void
    {
        $this->assertFalse($this->makeUser('OWNER', false)->hasPermission('pos'));
    }

    public function test_auth_array_exposes_permission_map_without_password(): void
    {
        $data = $this->makeUser('GUDANG')->toAuthArray();
        $this->assertSame('GUDANG', $data['role']);
        $this->assertSame('Cabang 3 Magelang', $data['branch_name']);
        $this->assertTrue($data['permissions']['stock_opname']);
        $this->assertFalse($data['permissions']['pos']);
        $this->assertCount(14, $data['permissions']);
        $this->assertArrayNotHasKey('password', $data);
    }
}
