<?php

namespace Tests\Feature;

use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ManualJournalApiTest extends TestCase
{
    use DatabaseTransactions;

    private function payload(?array $items = null, string $date = '2025-05-10'): array
    {
        return [
            'date' => $date,
            'description' => 'Koreksi biaya perawatan mesin',
            'items' => $items ?? [
                ['account_code' => '6-1006', 'debit' => 150000, 'credit' => 0, 'note' => 'Servis kompresor'],
                ['account_code' => '1-1001', 'debit' => 0, 'credit' => 150000],
            ],
        ];
    }

    public function test_manual_journal_is_posted_by_account_code(): void
    {
        $res = $this->postJson('/api/v1/accounting/journals/manual', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.reference_type', 'MANUAL_ADJUSTMENT')
            ->assertJsonPath('data.entry_date', '2025-05-10')
            ->assertJsonPath('data.can_reverse', true)
            ->assertJsonPath('data.created_by_name', 'Test OWNER');

        $this->assertStringStartsWith('MEMO-202505-', $res->json('data.reference_id'));
        $this->assertStringStartsWith('JRN-202505-', $res->json('data.entry_number'));
    }

    public function test_control_accounts_are_rejected(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload([
            ['account_code' => '1-2000', 'debit' => 100000, 'credit' => 0],
            ['account_code' => '3-1000', 'debit' => 0, 'credit' => 100000],
        ]))->assertStatus(422)->assertJsonValidationErrors('items.0.account_code');
    }

    public function test_each_line_needs_exactly_one_side(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload([
            ['account_code' => '6-1006', 'debit' => 100, 'credit' => 100],
            ['account_code' => '1-1001', 'debit' => 0, 'credit' => 0],
        ]))->assertStatus(422)->assertJsonValidationErrors(['items.0', 'items.1']);
    }

    public function test_unbalanced_journal_is_a_422(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload([
            ['account_code' => '6-1006', 'debit' => 150000, 'credit' => 0],
            ['account_code' => '1-1001', 'debit' => 0, 'credit' => 140000],
        ]))->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tidak seimbang'));
    }

    public function test_future_date_is_rejected(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload(null, now()->addDay()->toDateString()))
            ->assertStatus(422)->assertJsonValidationErrors('date');
    }

    public function test_manual_journal_can_be_reversed_only_once(): void
    {
        $number = $this->postJson('/api/v1/accounting/journals/manual', $this->payload())->json('data.entry_number');

        $this->postJson("/api/v1/accounting/journals/{$number}/reverse", ['reason' => 'Salah akun'])
            ->assertCreated()
            ->assertJsonPath('data.reference_type', 'MANUAL_REVERSAL')
            ->assertJsonPath('data.reversal_of', $number);

        $this->assertNotNull(JournalEntry::where('entry_number', $number)->first()->reversal);

        $this->postJson("/api/v1/accounting/journals/{$number}/reverse", ['reason' => 'lagi'])->assertStatus(422);
    }

    public function test_non_manual_journal_cannot_be_reversed_here(): void
    {
        $category = ExpenseCategory::where('category_code', 'ATK')->firstOrFail();
        $reference = $this->postJson('/api/v1/expenses', [
            'expense_date' => '2025-05-11', 'category_id' => $category->id, 'amount' => 50000,
            'payment_method' => 'TUNAI', 'recipient_name' => 'Toko ATK', 'description' => 'Kertas nota',
        ])->assertCreated()->json('data.expense.reference');
        $number = JournalEntry::where('reference_id', $reference)->value('entry_number');

        $this->postJson("/api/v1/accounting/journals/{$number}/reverse", ['reason' => 'x'])->assertStatus(422);
    }

    public function test_journal_list_filters_by_type_and_date(): void
    {
        $number = $this->postJson('/api/v1/accounting/journals/manual', $this->payload())->json('data.entry_number');

        $res = $this->getJson('/api/v1/accounting/journals?types=MANUAL_ADJUSTMENT,MANUAL_REVERSAL&start_date=2025-05-01&end_date=2025-05-31')
            ->assertOk()
            ->assertJsonStructure(['data' => ['items', 'current_page', 'last_page', 'total', 'total_debit', 'total_credit']]);

        $this->assertContains($number, array_column($res->json('data.items'), 'entry_number'));
        $this->assertSame(['MANUAL_ADJUSTMENT'], array_values(array_unique(array_column($res->json('data.items'), 'reference_type'))));
    }

    public function test_kasir_cannot_post_or_reverse(): void
    {
        $this->actingAsRole('KASIR');
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload())->assertForbidden();
        $this->postJson('/api/v1/accounting/journals/JRN-202505-0001/reverse', ['reason' => 'x'])->assertForbidden();
    }
}
