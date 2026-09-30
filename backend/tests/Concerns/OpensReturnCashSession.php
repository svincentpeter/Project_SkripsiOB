<?php

namespace Tests\Concerns;

use App\Models\JournalEntry;
use Illuminate\Support\Facades\DB;

/**
 * Retur penjualan mengembalikan uang dari laci, jadi butuh shift kasir OPEN (tabel cash_sessions dari SP2).
 * Bila SP2 mewajibkan kolom lain (NOT NULL), tambahkan nilainya di sini.
 */
trait OpensReturnCashSession
{
    protected function ensureOpenCashSessionForReturn(): int
    {
        $open = DB::table('cash_sessions')->where('status', 'OPEN')->value('id');

        return (int) ($open ?? DB::table('cash_sessions')->insertGetId([
            'user_id' => auth()->id(),
            'opened_at' => now(),
            'opening_float' => 500000,
            'book_opening' => 500000,
            'from_entry_id' => (int) JournalEntry::max('id'),
            'status' => 'OPEN',
            'created_at' => now(),
            'updated_at' => now(),
        ]));
    }
}
