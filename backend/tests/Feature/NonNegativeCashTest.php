<?php

namespace Tests\Feature;

use App\Models\CashSession;
use App\Models\JournalEntry;
use App\Services\Accounting\CashSessionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Saldo kas laci (1-1000) dan bank (1-1001) tidak boleh negatif: uang keluar melebihi saldo ditolak 422,
 * termasuk jurnal bertanggal mundur yang membuat saldo hari sesudahnya negatif. Uang masuk selalu lolos.
 */
class NonNegativeCashTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config(['accounting.guard_negative_cash' => true]);
    }

    private function balance(string $code): float
    {
        return round((float) DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->join('accounts as a', 'a.id', '=', 'i.account_id')
            ->where('a.account_code', $code)->where('e.status', 'POSTED')
            ->sum(DB::raw('i.debit - i.credit')), 2);
    }

    private function move(array $payload)
    {
        return $this->postJson('/api/v1/cash-movements', $payload + ['date' => now()->toDateString(), 'description' => 'Uji saldo']);
    }

    /** Setoran modal sampai saldo akun tepat $target (DB test bisa berisi sisa data tes lain). */
    private function fund(string $code, float $target, ?string $date = null): void
    {
        $gap = round($target - $this->balance($code), 2);
        $date ??= now()->toDateString();
        if ($gap !== 0.0) {
            $this->move(['type' => $gap > 0 ? 'CAPITAL' : 'DRAWING', 'account_code' => $code, 'amount' => abs($gap), 'date' => $date])->assertCreated();
        }
        $this->assertEquals($target, $this->balance($code));
    }

    public function test_drawing_beyond_the_drawer_balance_is_rejected_and_exact_amount_passes(): void
    {
        $this->fund('1-1000', 765000);

        $this->move(['type' => 'DRAWING', 'account_code' => '1-1000', 'amount' => 1000000])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, '1-1000') && str_contains($m, 'Rp -235.000'));
        $this->assertEquals(765000, $this->balance('1-1000'));

        $this->move(['type' => 'DEPOSIT', 'amount' => 765000])->assertCreated();
        $this->assertEquals(0, $this->balance('1-1000'));
    }

    public function test_backdated_outflow_that_turns_a_later_day_negative_is_rejected(): void
    {
        $this->fund('1-1000', 100000, now()->subDay()->toDateString());
        $this->move(['type' => 'DEPOSIT', 'amount' => 100000])->assertCreated();

        // Kemarin saldo masih cukup, tapi hari ini sudah disetor habis: prive bertanggal kemarin membuat hari ini minus.
        $this->move(['type' => 'DRAWING', 'account_code' => '1-1000', 'amount' => 50000, 'date' => now()->subDay()->toDateString()])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, now()->format('d/m/Y')));
    }

    public function test_guard_counts_a_shift_shortage_committed_after_the_transaction_snapshot(): void
    {
        // Baca biasa (tanpa kunci) agar snapshot transaksi test terbentuk sebelum koneksi kedua commit.
        $pending = CashSession::where('status', CashSession::PENDING)->get()->sum(fn (CashSession $s) => (float) $s->adjustment());

        // Koneksi kedua meniru shift yang ditutup kurang Rp 50.000 dan di-commit setelah snapshot itu.
        config(['database.connections.side' => config('database.connections.'.config('database.default'))]);
        $side = DB::connection('side');
        $userId = $side->table('users')->insertGetId([
            'name' => 'Kasir Snapshot', 'username' => uniqid('snap-'), 'email' => uniqid('snap-').'@omahban.test',
            'role' => 'KASIR', 'password' => bcrypt('secret-test'), 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $sessionId = $side->table('cash_sessions')->insertGetId([
            'user_id' => $userId, 'opened_at' => now(), 'opening_float' => 0, 'book_opening' => 0, 'closed_at' => now(),
            'closed_by' => $userId, 'expected_cash' => 50000, 'counted_cash' => 0, 'variance' => -50000,
            'variance_reason' => 'Uji snapshot', 'status' => CashSession::PENDING, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->beforeApplicationDestroyed(function () use ($sessionId, $userId) {
            DB::connection('side')->table('cash_sessions')->where('id', $sessionId)->delete();
            DB::connection('side')->table('users')->where('id', $userId)->delete();
            DB::purge('side');
        });

        $this->fund('1-1000', round(100000 - $pending, 2));
        // Isi laci menurut buku tinggal 50.000: prive 80.000 harus ditolak walau snapshot belum melihat shift itu.
        $this->move(['type' => 'DRAWING', 'account_code' => '1-1000', 'amount' => 80000])->assertStatus(422);
    }

    public function test_bank_cannot_go_negative_either(): void
    {
        $this->fund('1-1001', 50000);

        $this->move(['type' => 'DRAWING', 'account_code' => '1-1001', 'amount' => 50000.01])->assertStatus(422);
        $this->move(['type' => 'DRAWING', 'account_code' => '1-1001', 'amount' => 50000])->assertCreated();
    }

    public function test_pending_shift_shortage_counts_against_the_drawer_and_its_approval_is_not_blocked(): void
    {
        $id = DB::table('cash_sessions')->insertGetId([
            'user_id' => auth()->id(), 'opened_at' => now(), 'opening_float' => 0, 'book_opening' => 0,
            'from_entry_id' => (int) JournalEntry::max('id'), 'to_entry_id' => (int) JournalEntry::max('id'),
            'closed_at' => now(), 'closed_by' => auth()->id(), 'expected_cash' => 300000, 'counted_cash' => 0,
            'variance' => -300000, 'variance_reason' => 'Uji kurang', 'status' => 'PENDING_APPROVAL',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        // Isi laci menurut buku = ledger + selisih PENDING = 100.000.
        $this->fund('1-1000', round(100000 - CashSessionService::pendingAdjustment(), 2));

        $this->move(['type' => 'DRAWING', 'account_code' => '1-1000', 'amount' => 150000])->assertStatus(422);
        $this->move(['type' => 'DRAWING', 'account_code' => '1-1000', 'amount' => 100000])->assertCreated();

        $this->postJson("/api/v1/cash-sessions/{$id}/approve")->assertOk();
    }
}
