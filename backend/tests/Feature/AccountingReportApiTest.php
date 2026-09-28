<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AccountingReportApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_can_fetch_journals_list(): void
    {
        $this->getJson('/api/v1/accounting/journals')->assertOk()->assertJsonStructure(['success', 'data']);
    }

    public function test_can_fetch_general_ledger(): void
    {
        $this->getJson('/api/v1/accounting/general-ledger?account_code=1-1000')
            ->assertOk()
            ->assertJsonStructure(['data' => ['account', 'opening_balance', 'total_debit', 'total_credit', 'ending_balance', 'mutations']]);
    }

    public function test_can_fetch_trial_balance(): void
    {
        $this->getJson('/api/v1/accounting/trial-balance')
            ->assertOk()
            ->assertJsonStructure(['data' => ['as_of', 'accounts', 'total_debit', 'total_credit', 'difference', 'is_balanced']]);
    }

    public function test_can_fetch_financial_statements(): void
    {
        $this->getJson('/api/v1/accounting/financial-statements')
            ->assertOk()
            ->assertJsonStructure(['data' => ['period', 'income_statement', 'balance_sheet', 'equity_changes']]);
    }

    public function test_can_pay_supplier_debt(): void
    {
        $supplier = Supplier::firstOrCreate(
            ['supplier_code' => 'SUP-TEST-AP'],
            ['supplier_name' => 'PT Supplier Hutang Test', 'phone' => '08123456789']
        );
        $product = Product::create([
            'product_name' => 'Ban Hutang '.uniqid(), 'product_code' => 'AP-'.uniqid(), 'barcode' => 'BC-AP-'.uniqid(),
            'brand' => 'Bridgestone', 'product_cost' => 500000, 'product_price' => 700000, 'product_quantity' => 0,
        ]);
        $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $product->id, 'quantity' => 4, 'batch_cost' => 500000,
            'supplier_id' => $supplier->id, 'payment_method' => 'TEMPO',
        ])->assertCreated();

        $this->postJson('/api/v1/accounting/accounts-payable/pay', [
            'supplier_id' => $supplier->id,
            'amount' => 1000000,
            'payment_method' => 'BANK_BCA',
            'payment_date' => now()->toDateString(),
            'notes' => 'Pelunasan sebagian faktur ban Bridgestone',
        ])->assertOk()->assertJson(['success' => true]);

        $this->assertDatabaseHas('journal_entries', ['reference_type' => 'DEBT_PAYMENT']);
    }
}
