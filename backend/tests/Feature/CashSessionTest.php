<?php

namespace Tests\Feature;

use App\Models\ExpenseCategory;
use App\Models\RolePermission;
use App\Services\Accounting\CashSessionService;
use App\Services\Accounting\ExpenseService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Database\DeadlockException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Shift kasir: satu laci = akun 1-1000; selisih kas dijurnal ke 6-1010 saat pemilik menyetujui.
 */
class CashSessionTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    /** DB test berisi sisa data test lain: pastikan saldo buku laci positif agar hitungan kas tidak negatif. */
    private function topUpDrawer(): void
    {
        $gap = round(2000000 - CashSessionService::bookBalance(), 2);
        if ($gap > 0) {
            (new JournalDraft())->debit('1-1000', $gap, 'uji')->credit('3-1000', $gap, 'uji')
                ->post(app(AccountingEngine::class), 'TEST', 'CS-'.uniqid(), 'Uji saldo laci');
        }
    }

    /** Buka shift dengan kas awal = saldo buku (+ selisih awal opsional). */
    private function openShift(float $extra = 0, ?string $note = null): array
    {
        $this->topUpDrawer();
        $book = (float) $this->getJson('/api/v1/cash-sessions/current')->assertOk()->json('data.book_balance');

        return $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => $book + $extra, 'opening_note' => $note])
            ->assertCreated()
            ->json('data');
    }

    private function closeShift(int $id, float $counted, ?string $reason = null)
    {
        return $this->postJson("/api/v1/cash-sessions/{$id}/close", ['counted_cash' => $counted, 'variance_reason' => $reason]);
    }

    private function expense(float $amount, string $method = 'TUNAI'): void
    {
        app(ExpenseService::class)->create([
            'expense_date' => now()->toDateString(),
            'category_id' => ExpenseCategory::firstOrFail()->id,
            'amount' => $amount,
            'payment_method' => $method,
            'recipient_name' => 'Warung Sebelah',
            'description' => 'Uji biaya shift',
        ], null, $this->actingAsRole('OWNER'));
    }

    public function test_cash_accounts_and_permission_defaults_exist(): void
    {
        $this->assertDatabaseHas('accounts', ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT']);
        $this->assertDatabaseHas('accounts', ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT']);

        $kasir = $this->actingAsRole('KASIR');
        $this->assertTrue($kasir->hasPermission('cash_session'));
        $this->assertFalse($kasir->hasPermission('cash_session_approve'));
        $this->assertFalse($kasir->hasPermission('cash_movement'));

        $gudang = $this->actingAsRole('GUDANG');
        $this->assertFalse($gudang->hasPermission('cash_session'));

        $this->assertTrue($this->actingAsRole('OWNER')->hasPermission('cash_movement'));
    }

    public function test_cash_checkout_is_refused_without_an_open_shift(): void
    {
        $product = $this->makeProduct();

        $this->postJson('/api/v1/pos/checkout', [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'Shift kasir belum dibuka'));
        $this->assertEquals(10, $product->fresh()->product_quantity);

        // Penjualan non-tunai tidak menyentuh laci, jadi tidak butuh shift.
        $this->postJson('/api/v1/pos/checkout', [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TRANSFER', 'amount' => 1000000]],
        ])->assertCreated();
    }

    public function test_opening_note_is_required_when_the_float_differs_and_only_one_shift_is_open(): void
    {
        $this->topUpDrawer();
        $book = CashSessionService::bookBalance();

        $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => $book + 5000])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'keterangan selisih kas awal'));

        $session = $this->openShift(5000, 'Tambahan uang receh dari pemilik');
        $this->assertSame('OPEN', $session['status']);
        $this->assertEquals($book, $session['book_opening']);
        $this->assertEquals(5000, $session['opening_difference']);

        $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => $book, 'opening_note' => 'shift kedua'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'Masih ada shift'));
    }

    /**
     * Dua kasir yang membuka shift bersamaan: cek "masih ada shift" baru aman bila dijalankan di bawah kunci.
     * Koneksi kedua memegang kunci baris akun 1-1000; open() harus menunggu kunci itu (di sini: timeout)
     * sebelum memeriksa atau membuat shift, jadi tidak ada dua shift OPEN.
     */
    public function test_opening_a_shift_waits_for_the_drawer_lock(): void
    {
        config(['database.connections.cash_lock' => config('database.connections.'.config('database.default'))]);
        $other = DB::connection('cash_lock');
        $other->beginTransaction();
        $timeout = (int) DB::selectOne('SELECT @@SESSION.innodb_lock_wait_timeout AS t')->t;
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        try {
            $other->table('accounts')->where('account_code', CashSessionService::CASH)->lockForUpdate()->first();

            try {
                app(CashSessionService::class)->open($this->actingAsRole('OWNER'), 0, 'uji kunci');
                $this->fail('open() tidak menunggu kunci laci.');
            } catch (DeadlockException $e) {
                $this->assertStringContainsString('Lock wait timeout', $e->getMessage());
            }
            $this->assertNull(CashSessionService::current());
        } finally {
            $other->rollBack();
            DB::purge('cash_lock');
            DB::statement('SET SESSION innodb_lock_wait_timeout = '.$timeout);
        }

        $this->assertNotNull(app(CashSessionService::class)->open($this->actingAsRole('OWNER'), CashSessionService::bookBalance(), null)->id);
    }

    public function test_expected_cash_counts_only_drawer_movements_inside_the_shift(): void
    {
        $this->expense(20000); // sebelum shift: sudah ada di saldo buku, bukan mutasi shift
        $session = $this->openShift();
        $product = $this->makeProduct();

        $sale = $this->checkout(['items' => [$this->productLine($product, 2)], 'payments' => [['method' => 'TUNAI', 'amount' => 2000000, 'tendered' => 2200000]]])->assertCreated();
        $this->checkout(['items' => [$this->productLine($product)], 'payments' => [['method' => 'TRANSFER', 'amount' => 1000000]]])->assertCreated();
        $this->expense(100000);
        $this->expense(50000, 'TRANSFER');
        $refund = $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/returns", [
            'reason' => 'Retur sebagian untuk uji kas',
            'items' => [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]],
        ])->assertCreated()->json('data.sales_return.refund_amount');

        $current = $this->getJson('/api/v1/cash-sessions/current')->assertOk()->json('data.session');
        $lines = collect($current['lines'])->keyBy('reference_type');

        $this->assertEquals(2000000, $lines['POS_SALE']['amount']);
        $this->assertSame(1, $lines['POS_SALE']['count']);
        $this->assertSame('Penjualan tunai', $lines['POS_SALE']['label']);
        $this->assertEquals(-100000, $lines['EXPENSE']['amount']);
        $this->assertSame(1, $lines['EXPENSE']['count']);
        $this->assertEquals(-$refund, $lines['SALES_RETURN']['amount']);
        $this->assertSame('Retur penjualan (refund tunai)', $lines['SALES_RETURN']['label']);
        $this->assertFalse($lines->has('TEST'));
        $this->assertEquals(2000000, $current['cash_in']);
        $this->assertEquals(100000 + $refund, $current['cash_out']);
        $this->assertEquals($session['opening_float'] + 1900000 - $refund, $current['expected_cash']);

        $closed = $this->closeShift($session['id'], $current['expected_cash'])->assertOk()->json('data');
        $this->assertEquals($session['opening_float'] + 1900000 - $refund, $closed['expected_cash']);
    }

    public function test_close_requires_a_reason_for_a_variance_and_waits_for_approval(): void
    {
        $session = $this->openShift();
        $this->expense(30000);
        $expected = $session['opening_float'] - 30000;

        $this->closeShift($session['id'], $expected - 10000)
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'Alasan selisih wajib diisi'));

        $closed = $this->closeShift($session['id'], $expected - 10000, 'Uang kembalian kurang')->assertOk()->json('data');
        $this->assertSame('PENDING_APPROVAL', $closed['status']);
        $this->assertEquals($expected, $closed['expected_cash']);
        $this->assertEquals(-10000, $closed['variance']);
        $this->assertEquals(-10000, $closed['adjustment']);
        $this->assertNull($closed['journal_entry_number']);
        $this->assertNull($this->getJson('/api/v1/cash-sessions/current')->json('data.session'));

        $this->closeShift($session['id'], $expected, 'lagi')->assertStatus(422);
    }

    public function test_approval_journals_a_shortage_and_the_ledger_equals_the_counted_cash(): void
    {
        $session = $this->openShift();
        $counted = $session['opening_float'] - 25000;
        $this->closeShift($session['id'], $counted, 'Salah beri kembalian')->assertOk();

        $res = $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk()->json('data');

        $this->assertSame('CLOSED', $res['session']['status']);
        $this->assertCount(1, $res['journals']);
        $journal = $res['journals'][0];
        $this->assertSame('CASH_SESSION_VARIANCE', $journal['reference_type']);
        $this->assertSame('SHIFT-'.$session['id'], $journal['reference_id']);
        $lines = collect($journal['lines'])->keyBy('account_code');
        $this->assertEquals(25000, $lines['6-1010']['debit']);
        $this->assertEquals(25000, $lines['1-1000']['credit']);
        $this->assertSame($journal['entry_number'], $res['session']['journal_entry_number']);
        $this->assertEqualsWithDelta($counted, CashSessionService::ledgerBalance(), 0.001);

        $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertStatus(422);
    }

    public function test_overage_and_opening_difference_are_credited_to_6_1010_together(): void
    {
        $session = $this->openShift(5000, 'Tambahan uang receh');
        $counted = $session['opening_float'] + 2000;
        $this->closeShift($session['id'], $counted, 'Pelanggan tidak ambil kembalian')->assertOk();

        $journal = $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk()->json('data.journals.0');

        $lines = collect($journal['lines'])->keyBy('account_code');
        $this->assertEquals(7000, $lines['1-1000']['debit']);
        $this->assertEquals(7000, $lines['6-1010']['credit']);
        $this->assertEqualsWithDelta($counted, CashSessionService::ledgerBalance(), 0.001);
    }

    public function test_zero_adjustment_is_approved_without_a_journal(): void
    {
        $session = $this->openShift();
        $this->closeShift($session['id'], $session['opening_float'])->assertOk();

        $res = $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk()->json('data');

        $this->assertSame([], $res['journals']);
        $this->assertSame('CLOSED', $res['session']['status']);
        $this->assertNull($res['session']['journal_entry_number']);
    }

    public function test_a_pending_shift_difference_is_part_of_the_next_book_balance(): void
    {
        $first = $this->openShift();
        $this->closeShift($first['id'], $first['opening_float'] - 15000, 'Kurang')->assertOk();

        $this->assertEqualsWithDelta($first['opening_float'] - 15000, CashSessionService::bookBalance(), 0.001);
        $this->assertEqualsWithDelta(
            $first['opening_float'] - 15000,
            (float) $this->getJson('/api/v1/cash-sessions/current')->json('data.book_balance'),
            0.001
        );
    }

    /**
     * Invarian D7 lintas shift: A menunggu persetujuan, B dibuka (saldo buku termasuk selisih A), A disetujui
     * selama B, lalu mutasi tunai di B. Setelah B disetujui, 1-1000 = kas fisik B dan semua jurnal seimbang.
     */
    public function test_ledger_equals_the_counted_cash_after_interleaved_shifts(): void
    {
        $start = (int) DB::table('journal_entries')->max('id');
        $a = $this->openShift();
        $this->closeShift($a['id'], $a['opening_float'] - 15000, 'Kurang kembalian')->assertOk();

        $b = $this->openShift(3000, 'Tambahan receh');
        $this->assertEqualsWithDelta(CashSessionService::ledgerBalance() - 15000, $b['book_opening'], 0.001); // selisih A belum dijurnal
        $this->postJson("/api/v1/cash-sessions/{$a['id']}/approve")->assertOk()->assertJsonCount(1, 'data.journals');

        $product = $this->makeProduct();
        $this->checkout(['items' => [$this->productLine($product)], 'payments' => [['method' => 'TUNAI', 'amount' => 1000000]]])->assertCreated();
        $this->expense(40000);
        $this->postJson('/api/v1/cash-movements', ['type' => 'DEPOSIT', 'amount' => 300000, 'date' => now()->toDateString(), 'description' => 'Setor'])->assertCreated();
        $this->postJson('/api/v1/cash-movements', ['type' => 'DRAWING', 'account_code' => '1-1000', 'amount' => 50000, 'date' => now()->toDateString(), 'description' => 'Prive'])->assertCreated();

        $current = $this->getJson('/api/v1/cash-sessions/current')->json('data.session');
        $this->assertEquals($b['opening_float'] + 1000000 - 40000 - 300000 - 50000, $current['expected_cash']);
        $counted = $current['expected_cash'] - 7000;
        $this->closeShift($b['id'], $counted, 'Salah hitung')->assertOk();
        $this->postJson("/api/v1/cash-sessions/{$b['id']}/approve")->assertOk();

        $this->assertEqualsWithDelta($counted, CashSessionService::ledgerBalance(), 0.001);
        $unbalanced = DB::table('journal_items')
            ->where('journal_entry_id', '>', $start)
            ->select('journal_entry_id')
            ->groupBy('journal_entry_id')
            ->havingRaw('ROUND(SUM(debit) - SUM(credit), 2) <> 0')
            ->count();
        $this->assertSame(0, $unbalanced);
    }

    public function test_owner_list_shows_pending_shifts_first(): void
    {
        $session = $this->openShift();
        $this->closeShift($session['id'], $session['opening_float'])->assertOk();

        $this->getJson('/api/v1/cash-sessions')
            ->assertOk()
            ->assertJsonPath('data.0.id', $session['id'])
            ->assertJsonPath('data.0.status', 'PENDING_APPROVAL');
    }

    public function test_roles_without_the_keys_are_forbidden(): void
    {
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/cash-sessions/current')->assertForbidden();
        $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => 0])->assertForbidden();
        $this->postJson('/api/v1/cash-sessions/1/close', ['counted_cash' => 0])->assertForbidden();

        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/cash-sessions/current')->assertOk();
        $this->getJson('/api/v1/accounting/cash-balances')->assertOk();
        $this->getJson('/api/v1/cash-sessions')->assertForbidden();
        $this->postJson('/api/v1/cash-sessions/1/approve')->assertForbidden();
    }

    public function test_a_non_owner_approver_cannot_approve_their_own_shift(): void
    {
        RolePermission::where(['role' => 'KASIR', 'permission_key' => 'cash_session_approve'])->update(['allowed' => true]);
        $this->actingAsRole('KASIR');
        $session = $this->openShift();
        $this->closeShift($session['id'], $session['opening_float'])->assertOk();

        $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'harus disetujui pemilik'));

        $this->actingAsRole('OWNER');
        $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk();
    }
}
