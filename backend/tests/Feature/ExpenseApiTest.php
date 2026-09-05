<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    public function test_can_create_expense_with_sequential_bkk_and_journal(): void
    {
        $category = ExpenseCategory::firstOrCreate(
            ['category_code' => 'LISTRIK'],
            ['category_name' => 'Listrik & Air PLN', 'default_account_code' => '6-1001']
        );

        $payload = [
            'expense_date' => '2026-09-05',
            'category_id' => $category->id,
            'amount' => 350000,
            'payment_method' => 'KAS_LACI',
            'recipient_name' => 'Petugas PLN',
            'description' => 'Pembayaran tagihan listrik bulanan bengkel',
            'approved_by' => 'Owner Omah Ban',
        ];

        $response = $this->postJson('/api/v1/expenses', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'reference',
                    'amount',
                    'status',
                    'journal_entry_number',
                ]
            ]);

        $ref = $response->json('data.reference');
        $this->assertStringStartsWith('BKK-', $ref);
        $this->assertDatabaseHas('expenses', ['reference' => $ref, 'status' => 'ACTIVE']);
        $this->assertDatabaseHas('journal_entries', ['reference_id' => $ref, 'status' => 'POSTED']);
    }

    public function test_can_void_expense_and_generate_reversal_journal(): void
    {
        $category = ExpenseCategory::firstOrCreate(
            ['category_code' => 'ATK'],
            ['category_name' => 'Perlengkapan ATK', 'default_account_code' => '6-1005']
        );

        $payload = [
            'expense_date' => '2026-09-05',
            'category_id' => $category->id,
            'amount' => 150000,
            'payment_method' => 'BANK_BCA',
            'bank_name' => 'BCA Cabang 3',
            'recipient_name' => 'Toko Alat Tulis',
            'description' => 'Pembelian kertas nota thermal',
            'approved_by' => 'Owner',
        ];

        $createRes = $this->postJson('/api/v1/expenses', $payload);
        $expenseId = $createRes->json('data.id');
        $ref = $createRes->json('data.reference');

        // Void the expense
        $voidRes = $this->postJson("/api/v1/expenses/{$expenseId}/void");

        $voidRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'VOID',
                ]
            ]);

        $this->assertDatabaseHas('expenses', ['id' => $expenseId, 'status' => 'VOID']);
        $this->assertDatabaseHas('journal_entries', ['reference_id' => 'VOID-' . $ref]);
    }
}
