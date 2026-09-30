<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Shift kasir: satu laci = akun 1-1000; selisih kas dijurnal ke 6-1010 saat pemilik menyetujui.
 */
class CashSessionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_cash_accounts_and_permission_defaults_exist(): void
    {
        $this->assertDatabaseHas('accounts', ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT']);
        $this->assertDatabaseHas('accounts', ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT']);

        $kasir = $this->actingAsRole('KASIR');
        $this->assertTrue($kasir->hasPermission('cash_session'));
        $this->assertFalse($kasir->hasPermission('cash_session_approve'));
        $this->assertFalse($kasir->hasPermission('cash_movement'));

        $gudang = $this->actingAsRole('GUDANG');
        $this->assertFalse($gudang->hasPermission('cash_session'));

        $this->assertTrue($this->actingAsRole('OWNER')->hasPermission('cash_movement'));
    }
}
