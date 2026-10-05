<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Jurnal penyesuaian manual dan pembaliknya (storno). Akun kontrol tidak boleh disentuh karena saldonya
 * harus sama dengan buku pembantu (piutang, persediaan FIFO, hutang, uang muka DP).
 */
class ManualJournalService
{
    /** 1-3000/1-3999 hanya berubah lewat register aset tetap (perolehan, pembatalan, penyusutan) atau saldo awal akun. */
    public const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004', '1-3000', '1-3999'];

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{date: string, description: string, items: list<array{account_code: string, debit: float|int|string, credit: float|int|string, note?: ?string}>}  $data
     */
    public function create(array $data): JournalEntry
    {
        return DB::transaction(function () use ($data) {
            $draft = new JournalDraft();
            foreach ($data['items'] as $item) {
                $note = $item['note'] ?? $data['description'];
                (float) $item['debit'] > 0
                    ? $draft->debit($item['account_code'], (float) $item['debit'], $note)
                    : $draft->credit($item['account_code'], (float) $item['credit'], $note);
            }

            $reference = DocumentNumber::next(JournalEntry::class, 'reference_id', 'MEMO', $data['date']);

            return $draft->post($this->engine, JournalEntry::MANUAL, $reference, $data['description'], $data['date']);
        }, 3); // korban deadlock/lock-wait (JRN ↔ FK S 3-2000 dengan tutup/buka buku) diulang; closure hanya menulis DB
    }

    public function reverse(JournalEntry $entry, string $reason): JournalEntry
    {
        return DB::transaction(function () use ($entry, $reason) {
            $entry = JournalEntry::lockForUpdate()->findOrFail($entry->id);

            if ($entry->reference_type !== JournalEntry::MANUAL) {
                throw new PosRuleException('Hanya jurnal penyesuaian manual yang dapat dibalik di sini. Batalkan transaksi lain dari modul asalnya.');
            }
            if (JournalEntry::where('reversal_of_id', $entry->id)->exists()) {
                throw new PosRuleException("Jurnal {$entry->entry_number} sudah pernah dibalik.");
            }

            return $this->engine->createEntry(
                'MANUAL_REVERSAL',
                $entry->entry_number,
                "Pembalik {$entry->entry_number}: {$reason}",
                $entry->reversedItems('[PEMBALIK] '),
                now()->toDateString(),
                3,
                $entry->id
            );
        }, 3);
    }
}
