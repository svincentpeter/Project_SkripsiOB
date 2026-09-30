<?php

namespace Tests\Concerns;

use App\Services\AccountingEngine;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\JournalDraft;

/**
 * DB test dipakai bersama, jadi sisa data test lain bisa membuat 1-2000 ≠ nilai FIFO. Trait ini membukukan
 * selisihnya sebagai TEST_ALIGN (lewat engine) agar test mulai dari buku yang selaras, tanpa memakai saldo awal
 * persediaan yang hanya boleh dibukukan sekali.
 */
trait AlignsInventoryLedger
{
    protected function alignInventoryLedger(): void
    {
        $gap = InventoryValueJournal::summary()['difference'];
        $draft = new JournalDraft();
        if ($gap > 0) {
            $draft->debit('1-2000', $gap, 'Penyelarasan test')->credit('3-1000', $gap, 'Penyelarasan test');
        } elseif ($gap < 0) {
            $draft->debit('3-1000', -$gap, 'Penyelarasan test')->credit('1-2000', -$gap, 'Penyelarasan test');
        }
        if (! $draft->isEmpty()) {
            $draft->post(app(AccountingEngine::class), 'TEST_ALIGN', 'TEST-ALIGN', 'Penyelarasan nilai FIFO untuk test');
        }

        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }
}
