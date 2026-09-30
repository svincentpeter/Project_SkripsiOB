<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Retur penjualan (kasir) dan retur pembelian (gudang): akun kontra pendapatan 4-9100 dan izin default.
 */
class ReturnPermissionsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_sales_return_account_is_an_active_contra_revenue(): void
    {
        $this->assertDatabaseHas('accounts', [
            'account_code' => '4-9100',
            'account_name' => 'Retur Penjualan',
            'account_type' => 'REVENUE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);
    }

    public function test_kasir_may_return_sales_and_gudang_may_return_purchases_by_default(): void
    {
        $kasir = $this->actingAsRole('KASIR');
        $this->assertTrue($kasir->hasPermission('sales_return'));
        $this->assertFalse($kasir->hasPermission('purchase_return'));

        $gudang = $this->actingAsRole('GUDANG');
        $this->assertTrue($gudang->hasPermission('purchase_return'));
        $this->assertFalse($gudang->hasPermission('sales_return'));
    }

    public function test_owner_can_toggle_the_new_keys(): void
    {
        $this->putJson('/api/v1/settings/role-permissions', ['KASIR' => ['sales_return' => false]])->assertOk();
        $this->assertFalse($this->actingAsRole('KASIR')->hasPermission('sales_return'));
    }
}
