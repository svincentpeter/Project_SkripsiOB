<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Supplier;
use Tests\TestCase;

class AccountingReportApiTest extends TestCase
{
    public function test_can_fetch_journals_list(): void
    {
        $response = $this->getJson('/api/v1/accounting/journals');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_can_create_manual_journal_entry(): void
    {
        $accBebanPenyusutan = Account::firstOrCreate(
            ['account_code' => '6-1006'],
            ['account_name' => 'Beban Perawatan & Penyusutan', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT']
        );
        $accAkumulasi = Account::firstOrCreate(
            ['account_code' => '1-3999'],
            ['account_name' => 'Akumulasi Penyusutan Mesin', 'account_type' => 'ASSET', 'normal_balance' => 'CREDIT']
        );

        $payload = [
            'date' => '2026-09-05',
            'description' => 'Penyusutan Mesin Spooring 3D Bulan September 2026',
            'items' => [
                ['account_id' => $accBebanPenyusutan->id, 'debit' => 500000, 'credit' => 0, 'note' => 'Beban Penyusutan'],
                ['account_id' => $accAkumulasi->id, 'debit' => 0, 'credit' => 500000, 'note' => 'Akumulasi Penyusutan'],
            ]
        ];

        $response = $this->postJson('/api/v1/accounting/journals/manual', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('journal_entries', [
            'description' => 'Penyusutan Mesin Spooring 3D Bulan September 2026',
            'total_debit' => 500000,
            'total_credit' => 500000,
        ]);
    }

    public function test_can_fetch_general_ledger(): void
    {
        $response = $this->getJson('/api/v1/accounting/general-ledger?account_code=1-1000');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'account',
                    'total_debit',
                    'total_credit',
                    'ending_balance',
                    'mutations',
                ]
            ]);
    }

    public function test_can_fetch_trial_balance(): void
    {
        $response = $this->getJson('/api/v1/accounting/trial-balance');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'accounts',
                    'total_debit',
                    'total_credit',
                    'difference',
                    'is_balanced',
                ]
            ]);
    }

    public function test_can_fetch_financial_statements(): void
    {
        $response = $this->getJson('/api/v1/accounting/financial-statements');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'income_statement',
                    'balance_sheet',
                    'notes',
                ]
            ]);
    }

    public function test_can_pay_supplier_debt(): void
    {
        $supplier = Supplier::firstOrCreate(
            ['supplier_code' => 'SUP-TEST-AP'],
            ['supplier_name' => 'PT Supplier Hutang Test', 'phone' => '08123456789']
        );

        $payload = [
            'supplier_id' => $supplier->id,
            'amount' => 1000000,
            'payment_method' => 'BANK_BCA',
            'payment_date' => '2026-09-05',
            'notes' => 'Pelunasan sebagian faktur ban Bridgestone',
        ];

        $response = $this->postJson('/api/v1/accounting/accounts-payable/pay', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'DEBT_PAYMENT',
        ]);
    }
}
