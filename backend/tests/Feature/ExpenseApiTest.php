<?php

namespace Tests\Feature;

use App\Models\AccountingPeriodClosing;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    use DatabaseTransactions;

    private function category(string $code): ExpenseCategory
    {
        return ExpenseCategory::where('category_code', $code)->firstOrFail();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'expense_date' => '2025-06-10',
            'category_id' => $this->category('LISTRIK')->id,
            'amount' => 350000,
            'payment_method' => 'TUNAI',
            'recipient_name' => 'Petugas PLN',
            'description' => 'Tagihan listrik bulanan bengkel',
        ], $overrides);
    }

    private function lines(JournalEntry $entry): array
    {
        return $entry->items()->with('account')->get()
            ->mapWithKeys(fn ($i) => [$i->account->account_code => [(float) $i->debit, (float) $i->credit]])->all();
    }

    public function test_categories_are_seeded_with_frontend_names(): void
    {
        $this->getJson('/api/v1/expense-categories')
            ->assertOk()
            ->assertJsonCount(8, 'data')
            ->assertJsonFragment(['code' => 'LISTRIK', 'name' => 'Listrik & Air (PLN/PDAM)', 'account_code' => '6-1001']);
    }

    public function test_cash_expense_posts_bkk_and_journal_in_the_expense_month(): void
    {
        $res = $this->postJson('/api/v1/expenses', $this->payload())->assertCreated();

        $reference = $res->json('data.expense.reference');
        $this->assertStringStartsWith('BKK-202506-', $reference);
        $res->assertJsonPath('data.expense.approved_by', 'Test OWNER')
            ->assertJsonPath('data.expense.category.account_code', '6-1001')
            ->assertJsonPath('data.journals.0.entry_date', '2025-06-10');

        $entry = JournalEntry::where('reference_type', 'EXPENSE')->where('reference_id', $reference)->firstOrFail();
        $this->assertEquals(['6-1001' => [350000, 0], '1-1000' => [0, 350000]], $this->lines($entry));
    }

    public function test_bank_expense_credits_the_bank_account(): void
    {
        $res = $this->postJson('/api/v1/expenses', $this->payload(['payment_method' => 'TRANSFER_BCA', 'bank_name' => 'BCA']))->assertCreated();

        $entry = JournalEntry::where('reference_id', $res->json('data.expense.reference'))->firstOrFail();
        $this->assertArrayHasKey('1-1001', $this->lines($entry));
    }

    public function test_attachment_is_stored_under_the_bkk_number(): void
    {
        Storage::fake('public');

        $res = $this->post('/api/v1/expenses', $this->payload(['attachment' => UploadedFile::fake()->image('nota.jpg')]), ['Accept' => 'application/json'])
            ->assertCreated();

        $this->assertStringStartsWith('/storage/expenses/BKK-202506-', $res->json('data.expense.attachment_url'));
    }

    public function test_future_dated_expense_is_rejected(): void
    {
        $this->postJson('/api/v1/expenses', $this->payload(['expense_date' => now()->addDay()->toDateString()]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('expense_date');
    }

    public function test_expense_in_a_closed_period_is_rejected(): void
    {
        AccountingPeriodClosing::create(['period' => '2025-06', 'end_date' => '2025-06-30', 'net_income' => 0, 'closed_at' => now()]);

        $this->postJson('/api/v1/expenses', $this->payload())->assertStatus(422);
    }

    public function test_void_posts_a_linked_reversal_once(): void
    {
        $created = $this->postJson('/api/v1/expenses', $this->payload())->assertCreated();
        $id = $created->json('data.expense.id');
        $original = JournalEntry::where('reference_id', $created->json('data.expense.reference'))->firstOrFail();

        $this->postJson("/api/v1/expenses/{$id}/void", ['reason' => 'Salah input nominal'])
            ->assertOk()
            ->assertJsonPath('data.expense.status', 'VOID')
            ->assertJsonPath('data.expense.void_reason', 'Salah input nominal')
            ->assertJsonPath('data.expense.voided_by', 'Test OWNER')
            ->assertJsonPath('data.journals.0.reversal_of', $original->entry_number);

        $reversal = JournalEntry::where('reference_type', 'VOID_EXPENSE')->where('reversal_of_id', $original->id)->firstOrFail();
        $this->assertEquals(['1-1000' => [350000, 0], '6-1001' => [0, 350000]], $this->lines($reversal));

        $this->postJson("/api/v1/expenses/{$id}/void", ['reason' => 'lagi'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Pengeluaran ini sudah dibatalkan (VOID).');
    }

    public function test_void_requires_a_reason(): void
    {
        $id = $this->postJson('/api/v1/expenses', $this->payload())->json('data.expense.id');

        $this->postJson("/api/v1/expenses/{$id}/void", [])->assertStatus(422)->assertJsonValidationErrors('reason');
    }

    public function test_list_returns_mapped_items(): void
    {
        $this->postJson('/api/v1/expenses', $this->payload())->assertCreated();

        $this->getJson('/api/v1/expenses?start_date=2025-06-01&end_date=2025-06-30')
            ->assertOk()
            ->assertJsonStructure(['data' => ['items' => [['id', 'reference', 'category', 'amount', 'status']], 'current_page', 'last_page', 'total']]);
    }

    public function test_kasir_without_expense_permission_is_denied(): void
    {
        $this->actingAsRole('KASIR');
        $this->postJson('/api/v1/expenses', $this->payload())->assertForbidden();
        $this->postJson('/api/v1/expenses/1/void', ['reason' => 'x'])->assertForbidden();
    }
}
