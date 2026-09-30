<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Models\CashSession;
use App\Models\JournalEntry;
use App\Services\Accounting\CashSessionService;
use Illuminate\Support\Facades\DB;
use PDOException;
use Tests\TestCase;

/**
 * Checkout tunai vs tutup shift di perangkat lain. Tanpa DatabaseTransactions: koneksi kedua harus melihat
 * baris shift yang sudah di-commit, jadi baris itu dihapus sendiri di tearDown.
 */
class CashSessionLockTest extends TestCase
{
    private const TAG = 'CashSessionLockTest';

    private ?CashSession $session = null;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.connections.cash_lock' => config('database.connections.'.config('database.default'))]);
        // Sisa run yang terhenti: hapus hanya baris bertanda milik test ini (DB test dipakai bersama).
        CashSession::whereKey(CashSession::where('opening_note', self::TAG)->pluck('id'))->delete();
        $this->assertNull(CashSessionService::current(), 'DB test masih berisi shift OPEN dari run sebelumnya.');
        $this->session = CashSession::create([
            'user_id' => $this->actingAsRole('OWNER')->id,
            'opened_at' => now(),
            'opening_float' => 0,
            'book_opening' => 0,
            'opening_note' => self::TAG,
            'from_entry_id' => (int) JournalEntry::max('id'),
            'status' => CashSession::OPEN,
            'branch_id' => 3,
        ]);
    }

    protected function tearDown(): void
    {
        DB::purge('cash_lock');
        $this->session?->delete();
        parent::tearDown();
    }

    /** close() memegang kunci X baris shift; checkout tunai harus menunggu, bukan lanjut di luar jendela shift. */
    public function test_require_open_waits_for_a_closing_shift(): void
    {
        $other = DB::connection('cash_lock');
        $other->beginTransaction();
        $timeout = (int) DB::selectOne('SELECT @@SESSION.innodb_lock_wait_timeout AS t')->t;
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        try {
            $other->table('cash_sessions')->where('id', $this->session->id)->lockForUpdate()->first();

            try {
                DB::transaction(fn () => CashSessionService::requireOpen());
                $this->fail('requireOpen() tidak menunggu kunci shift yang sedang ditutup.');
            } catch (PDOException $e) {
                $this->assertStringContainsString('Lock wait timeout', $e->getMessage());
            }
        } finally {
            $other->rollBack();
            DB::statement('SET SESSION innodb_lock_wait_timeout = '.$timeout);
        }
    }

    /**
     * Insert journal_items 1-1000 mengambil kunci S FK pada baris akun 1-1000. requireOpen() memegang kunci S itu
     * sejak awal, jadi close() (X akun 1-1000 lalu X baris shift) antre di langkah pertamanya, bukan membentuk siklus.
     */
    public function test_require_open_holds_the_drawer_account_lock(): void
    {
        $other = DB::connection('cash_lock');
        DB::beginTransaction();
        try {
            CashSessionService::requireOpen();
            $other->statement('SET SESSION innodb_lock_wait_timeout = 1');
            $other->beginTransaction();
            try {
                $other->table('accounts')->where('account_code', CashSessionService::CASH)->lockForUpdate()->first();
                $this->fail('requireOpen() tidak memegang kunci S akun 1-1000.');
            } catch (PDOException $e) {
                $this->assertStringContainsString('Lock wait timeout', $e->getMessage());
            } finally {
                $other->rollBack();
            }
        } finally {
            DB::rollBack();
        }
    }

    /** Snapshot checkout masih melihat OPEN, tetapi close() sudah commit: status dicek ulang dari baca terkunci. */
    public function test_require_open_rechecks_the_status_under_the_lock(): void
    {
        DB::beginTransaction();
        try {
            $this->assertNotNull(CashSessionService::current()); // snapshot REPEATABLE READ: OPEN
            DB::connection('cash_lock')->table('cash_sessions')->where('id', $this->session->id)
                ->update(['status' => CashSession::PENDING]);

            $this->expectException(PosRuleException::class);
            CashSessionService::requireOpen();
        } finally {
            DB::rollBack();
        }
    }
}
