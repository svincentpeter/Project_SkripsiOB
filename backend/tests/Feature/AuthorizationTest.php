<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    protected bool $authenticateAsOwner = false;

    /** Sampel satu endpoint per kelompok izin. */
    public static function protectedEndpoints(): array
    {
        return [
            ['GET', '/api/v1/products'],
            ['POST', '/api/v1/products'],
            ['POST', '/api/v1/pos/checkout'],
            ['GET', '/api/v1/pos/transactions'],
            ['POST', '/api/v1/inventory/restock'],
            ['POST', '/api/v1/stock/commit'],
            ['GET', '/api/v1/reports/stock-monthly'],
            ['GET', '/api/v1/expenses'],
            ['GET', '/api/v1/accounting/journals'],
            ['GET', '/api/v1/accounting/financial-statements'],
            ['GET', '/api/v1/accounting/accounts-payable'],
            ['POST', '/api/v1/settings/edc'],
            ['GET', '/api/v1/settings/role-permissions'],
            ['POST', '/api/v1/payment/qris/charge'],
        ];
    }

    #[DataProvider('protectedEndpoints')]
    public function test_requires_token(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertUnauthorized();
    }

    public function test_public_endpoints_stay_public(): void
    {
        $this->getJson('/api/v1/health')->assertOk();
        $this->assertNotSame(401, $this->postJson('/api/v1/payment/midtrans/webhook', [])->status());
    }

    public function test_kasir_is_denied_accounting_and_allowed_catalog(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/journals')->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak memiliki izin untuk aksi ini.');
        $this->getJson('/api/v1/expenses')->assertForbidden();
        $this->postJson('/api/v1/products', [])->assertForbidden();
        $this->getJson('/api/v1/products')->assertOk();
        $this->getJson('/api/v1/pos/transactions')->assertOk();
    }

    public function test_gudang_is_denied_checkout_and_allowed_inventory(): void
    {
        $this->actingAsRole('GUDANG');
        $this->postJson('/api/v1/pos/checkout', [])->assertForbidden();
        $this->getJson('/api/v1/accounting/trial-balance')->assertForbidden();
        $this->getJson('/api/v1/inventory/stock-movements')->assertOk();
        $this->getJson('/api/v1/products')->assertOk();
    }

    public function test_owner_is_allowed_everywhere(): void
    {
        $this->actingAsRole('OWNER');
        $this->getJson('/api/v1/accounting/journals')->assertOk();
        $this->getJson('/api/v1/expenses')->assertOk();
        $this->getJson('/api/v1/settings/role-permissions')->assertOk();
    }

    public function test_role_permission_matrix_read_and_update(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/settings/role-permissions')->assertOk()
            ->assertJsonPath('KASIR.pos', true)->assertJsonPath('GUDANG.pos', false);
        $this->putJson('/api/v1/settings/role-permissions', [])->assertForbidden();

        $this->actingAsRole('OWNER');
        $matrix = $this->getJson('/api/v1/settings/role-permissions')->json();
        $matrix['KASIR']['expenses'] = true;
        $matrix['OWNER'] = ['pos' => false];
        $this->putJson('/api/v1/settings/role-permissions', $matrix)->assertOk()
            ->assertJsonPath('KASIR.expenses', true)->assertJsonMissingPath('OWNER');

        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/expenses')->assertOk();
    }

    public function test_update_rejects_unknown_keys(): void
    {
        $this->actingAsRole('OWNER');
        $this->putJson('/api/v1/settings/role-permissions', ['KASIR' => ['hapus_semua' => true]])->assertStatus(422);
    }

    public function test_deactivated_user_is_forbidden(): void
    {
        $kasir = $this->actingAsRole('KASIR');
        $kasir->update(['is_active' => false]);
        $this->getJson('/api/v1/products')->assertForbidden();
    }
}
