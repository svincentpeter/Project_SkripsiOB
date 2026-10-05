<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Services\Accounting\ManualJournalService;
use App\Services\AccountingEngine;
use Illuminate\Database\DeadlockException;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Korban deadlock (siklus JRN-P ↔ FK S 3-2000 dengan tutup/buka buku) diulang, bukan 500. Laravel hanya mengulang
 * transaksi tingkat pertama, jadi test ini tanpa DatabaseTransactions; jurnal yang ter-commit dihapus di tearDown.
 */
class ManualJournalRetryTest extends TestCase
{
    /** @var list<int> */
    private array $entryIds = [];

    protected function tearDown(): void
    {
        foreach (array_reverse($this->entryIds) as $id) { // pembalik dulu (FK reversal_of_id)
            DB::table('journal_items')->where('journal_entry_id', $id)->delete();
            DB::table('journal_entries')->where('id', $id)->delete();
        }
        parent::tearDown();
    }

    /** Engine yang gagal deadlock sekali sebelum membukukan sungguhan. */
    private function engineFailingOnce(): void
    {
        $this->app->instance(AccountingEngine::class, new class extends AccountingEngine
        {
            public int $calls = 0;

            public function createEntry(string $referenceType, string $referenceId, string $description, array $items, ?string $entryDate = null, int $branchId = 3, ?int $reversalOfId = null): JournalEntry
            {
                if (++$this->calls === 1) {
                    throw new DeadlockException('Deadlock found when trying to get lock; try restarting transaction', 40001);
                }

                return parent::createEntry($referenceType, $referenceId, $description, $items, $entryDate, $branchId, $reversalOfId);
            }
        });
    }

    public function test_manual_journal_create_and_reverse_retry_a_deadlock_victim(): void
    {
        $this->engineFailingOnce();
        $entry = app(ManualJournalService::class)->create([
            'date' => '2019-05-10',
            'description' => 'Uji ulang deadlock',
            'items' => [
                ['account_code' => '6-1006', 'debit' => 1000, 'credit' => 0],
                ['account_code' => '1-1001', 'debit' => 0, 'credit' => 1000],
            ],
        ]);
        $this->entryIds[] = $entry->id;
        $this->assertSame(2, app(AccountingEngine::class)->calls);

        $this->engineFailingOnce();
        $reversal = app(ManualJournalService::class)->reverse($entry, 'Uji ulang deadlock');
        $this->entryIds[] = $reversal->id;
        $this->assertSame(2, app(AccountingEngine::class)->calls);
        $this->assertSame($entry->id, $reversal->reversal_of_id);
    }
}
