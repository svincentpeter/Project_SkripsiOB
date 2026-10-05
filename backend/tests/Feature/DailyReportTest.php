<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Models\User;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use App\Services\Pos\PosAccounts;
use App\Services\Reports\DailyReportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Laporan operasional harian: uang dari jurnal (sama dengan Laba Rugi & perubahan kas), jumlah nota dari tabel
 * penjualan. Tanggal uji di tahun 2020 agar tidak bercampur dengan data test lain.
 */
class DailyReportTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines, string $referenceType): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), $referenceType, 'DR-'.uniqid(), 'Uji laporan harian', $date);
    }

    /**
     * Nota dibuat langsung sebagai model (tanpa checkout, jadi tidak butuh sesi kasir SP2).
     *
     * @param  list<array{0: string, 1: float}>  $payments  [[metode, jumlah], ...]
     */
    private function makeSale(string $date, string $cashier, array $payments, string $status = 'LUNAS', int $tyres = 1, int $services = 0, ?User $user = null): Sale
    {
        $total = array_sum(array_column($payments, 1));
        $sale = Sale::create([
            'reference' => 'DR-INV-'.uniqid(),
            'date' => $date,
            'cashier_name' => $cashier,
            'user_id' => $user?->id,
            'total_hpp' => 40000,
            'gross_sales_amount' => $total,
            'total_amount' => $total,
            'paid_amount' => $total,
            'payment_method' => count($payments) === 1 ? $payments[0][0] : 'SPLIT',
            'status' => $status,
            'voided_at' => $status === 'VOID' ? $date.' 15:00:00' : null,
        ]);
        foreach ([['PRODUCT', $tyres], ['SERVICE', $services]] as [$type, $qty]) {
            if ($qty > 0) {
                SaleDetail::create([
                    'sale_id' => $sale->id, 'item_type' => $type, 'item_name' => $type,
                    'quantity' => $qty, 'unit_price' => 1000, 'sub_total' => 1000 * $qty,
                ]);
            }
        }
        foreach ($payments as [$method, $amount]) {
            SalePayment::create([
                'sale_id' => $sale->id, 'method' => $method,
                'account_code' => $method === 'TUNAI' ? '1-1000' : '1-1001',
                'amount' => $amount, 'net_received' => $amount,
            ]);
        }

        return $sale;
    }

    public function test_recap_rows_follow_the_income_statement_and_the_cash_change(): void
    {
        // 10 Feb: nota split tunai + QRIS (MDR 2rb), diskon 10rb, HPP FIFO 250rb.
        $this->postJournal('2020-02-10', [['1-1000', 300000, 0], ['1-1001', 198000, 0], ['6-1009', 2000, 0], ['4-9000', 10000, 0], ['4-1000', 0, 460000], ['4-1001', 0, 50000]], 'POS_SALE');
        $this->postJournal('2020-02-10', [['5-1000', 250000, 0], ['1-2000', 0, 250000]], 'POS_SALE');
        // 11 Feb: biaya tunai; retur penjualan (refund tunai dari laci, barang kembali ke stok FIFO).
        $this->postJournal('2020-02-11', [['6-1001', 20000, 0], ['1-1000', 0, 20000]], 'EXPENSE');
        $this->postJournal('2020-02-11', [['4-9100', 100000, 0], ['1-1000', 0, 100000]], 'SALES_RETURN');
        $this->postJournal('2020-02-11', [['1-2000', 60000, 0], ['5-1000', 0, 60000]], 'SALES_RETURN');
        // 12 Feb: setor kas laci ke bank.
        $this->postJournal('2020-02-12', [['1-1001', 50000, 0], ['1-1000', 0, 50000]], 'CASH_DEPOSIT');

        $recap = app(DailyReportService::class)->recap('2020-02-10', '2020-02-12');

        $this->assertSame(['2020-02-10', '2020-02-11', '2020-02-12'], array_column($recap['rows'], 'date'));
        [$d10, $d11, $d12] = $recap['rows'];

        $this->assertEquals(510000, $d10['revenue']);
        $this->assertEquals(460000, $d10['goods_revenue']);
        $this->assertEquals(50000, $d10['service_revenue']);
        $this->assertEquals(10000, $d10['contra_revenue']);
        $this->assertEquals(0, $d10['returns']);
        $this->assertEquals(500000, $d10['net_revenue']);
        $this->assertEquals(250000, $d10['cost_of_sales']);
        $this->assertEquals(250000, $d10['gross_profit']);
        $this->assertEquals(2000, $d10['operating_expenses']);
        $this->assertEquals(248000, $d10['net_income']);
        $this->assertEquals(498000, $d10['cash_in']);
        $this->assertEquals(0, $d10['cash_out']);

        $this->assertEquals(100000, $d11['returns']);
        $this->assertEquals(-100000, $d11['net_revenue']);
        $this->assertEquals(-60000, $d11['cost_of_sales']);
        $this->assertEquals(20000, $d11['operating_expenses']);
        $this->assertEquals(-60000, $d11['net_income']);
        $this->assertEquals(120000, $d11['cash_out']);

        $this->assertEquals(50000, $d12['cash_in']);
        $this->assertEquals(50000, $d12['cash_out']);
        $this->assertEquals(0, $d12['net_cash']);
        $this->assertEquals(0, $d12['net_income']);

        // Jumlah rekap = Laba Rugi periode yang sama (klasifikasi & pengecualian tutup buku sama).
        $income = app(FinancialReportService::class)->incomeStatement('2020-02-10', '2020-02-12');
        $this->assertEqualsWithDelta($income['net_revenue'], $recap['totals']['net_revenue'], 0.001);
        $this->assertEqualsWithDelta($income['cost_of_sales']['total'], $recap['totals']['cost_of_sales'], 0.001);
        $this->assertEqualsWithDelta($income['operating_expenses']['total'], $recap['totals']['operating_expenses'], 0.001);
        $this->assertEqualsWithDelta($income['net_income'], $recap['totals']['net_income'], 0.001);

        // Mutasi kas = perubahan saldo 1-1000 + 1-1001.
        $change = array_sum(CashFlowReport::cashBalances('2020-02-12')) - array_sum(CashFlowReport::cashBalances('2020-02-09'));
        $this->assertEqualsWithDelta($change, $recap['totals']['net_cash'], 0.001);
    }

    public function test_recap_cash_columns_exclude_a_same_day_account_opening(): void
    {
        // Saldo awal akun bukan arus kas: tidak masuk Kas Masuk/Kas Bersih rekap (dilipat ke saldo awal Kas Harian).
        $this->postJournal('2020-02-20', [['1-1000', 500000, 0], ['3-1000', 0, 500000]], 'ACCOUNT_OPENING');
        $this->postJournal('2020-02-20', [['1-1000', 100000, 0], ['4-1000', 0, 100000]], 'POS_SALE');

        $row = app(DailyReportService::class)->recap('2020-02-20', '2020-02-20')['rows'][0];

        $this->assertEquals(100000, $row['cash_in']);
        $this->assertEquals(0, $row['cash_out']);
        $this->assertEquals(100000, $row['net_cash']);
        $this->assertEquals(100000, $row['net_income']);
    }

    public function test_every_checkout_method_maps_to_a_payment_group(): void
    {
        // Metode checkout baru tanpa kelompok akan hilang diam-diam dari payment_mix dan by_method kasir.
        foreach (PosAccounts::CHECKOUT_METHODS as $method) {
            $this->assertArrayHasKey($method, DailyReportService::PAYMENT_GROUPS, $method);
            $this->assertContains(DailyReportService::PAYMENT_GROUPS[$method], ['TUNAI', 'TRANSFER', 'QRIS'], $method);
        }
    }

    public function test_counts_and_payment_mix_ignore_voided_notas(): void
    {
        $this->makeSale('2020-03-05', 'Kasir A', [['TUNAI', 100000]], tyres: 2);
        $this->makeSale('2020-03-05', 'Kasir B', [['TUNAI', 50000], ['QRIS', 70000]], tyres: 1, services: 1);
        $this->makeSale('2020-03-05', 'Kasir A', [['TRANSFER_BCA', 80000]]);
        $this->makeSale('2020-03-05', 'Kasir A', [['TRANSFER', 90000]], 'VOID', tyres: 4);

        $row = app(DailyReportService::class)->recap('2020-03-05', '2020-03-05')['rows'][0];

        $this->assertSame(3, $row['sales_count']);
        $this->assertSame(4, $row['product_qty']);
        $this->assertEquals(['TUNAI' => 150000, 'TRANSFER' => 80000, 'QRIS' => 70000], $row['payment_mix']);
    }

    public function test_void_on_a_later_day_reverses_money_on_the_void_date(): void
    {
        $this->postJournal('2020-03-20', [['1-1000', 100000, 0], ['4-1000', 0, 100000]], 'POS_SALE');
        $this->postJournal('2020-03-21', [['4-1000', 100000, 0], ['1-1000', 0, 100000]], 'POS_SALE_VOID');

        $recap = app(DailyReportService::class)->recap('2020-03-20', '2020-03-21');

        $this->assertEquals(100000, $recap['rows'][0]['revenue']);
        $this->assertEquals(100000, $recap['rows'][0]['cash_in']);
        $this->assertEquals(-100000, $recap['rows'][1]['revenue']);
        $this->assertEquals(100000, $recap['rows'][1]['cash_out']);
        $this->assertEquals(0, $recap['totals']['revenue']);
        $this->assertEquals(0, $recap['totals']['net_cash']);
    }

    public function test_recap_endpoint_shape_range_rules_and_permissions(): void
    {
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')
            ->assertOk()
            ->assertJsonCount(3, 'data.rows')
            ->assertJsonStructure(['data' => [
                'from', 'to',
                'rows' => [['date', 'sales_count', 'product_qty', 'net_revenue', 'gross_profit', 'net_income', 'payment_mix' => ['TUNAI', 'TRANSFER', 'QRIS'], 'cash_in', 'cash_out', 'net_cash']],
                'totals' => ['sales_count', 'net_revenue', 'operating_expenses', 'payment_mix'],
            ]]);

        $this->getJson('/api/v1/reports/daily-recap?from=2020-01-01&to=2020-04-01')->assertOk()->assertJsonCount(92, 'data.rows');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-01-01&to=2020-04-02')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Rentang rekap harian maksimal 92 hari.');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-12&to=2020-02-10')->assertStatus(422)->assertJsonValidationErrors('to');

        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')->assertForbidden();
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')->assertForbidden();
    }

    /** Baris sesi kasir SP2 (kolom NOT NULL tanpa default: book_opening). */
    private function insertCashSession(User $user, string $openedAt, array $overrides = []): int
    {
        return DB::table('cash_sessions')->insertGetId($overrides + [
            'user_id' => $user->id,
            'opened_at' => $openedAt,
            'opening_float' => 200000,
            'book_opening' => 200000,
            'closed_at' => null,
            'expected_cash' => 300000,
            'counted_cash' => 295000,
            'variance' => -5000,
            'variance_reason' => 'Uang kembalian kurang',
            'status' => 'PENDING_APPROVAL',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_daily_cash_accounts_reconcile_and_movements_are_grouped_by_type(): void
    {
        $date = '2020-04-07';
        $this->postJournal($date, [['1-1000', 500000, 0], ['3-1000', 0, 500000]], 'ACCOUNT_OPENING');
        $this->postJournal($date, [['1-1000', 100000, 0], ['4-1000', 0, 100000]], 'POS_SALE');
        $this->postJournal($date, [['6-1003', 30000, 0], ['1-1000', 0, 30000]], 'EXPENSE');
        $this->postJournal($date, [['1-1001', 40000, 0], ['1-1000', 0, 40000]], 'CASH_DEPOSIT');
        $before = CashFlowReport::cashBalances('2020-04-06');

        $report = app(DailyReportService::class)->dailyCash($date);

        $this->assertSame('all', $report['scope']);
        $accounts = collect($report['cash_accounts'])->keyBy('code');
        // Saldo awal akun bertanggal hari itu masuk ke saldo awal, bukan ke kas masuk.
        $this->assertEqualsWithDelta($before['1-1000'] + 500000, $accounts['1-1000']['opening'], 0.001);
        $this->assertEquals(100000, $accounts['1-1000']['cash_in']);
        $this->assertEquals(70000, $accounts['1-1000']['cash_out']);
        $this->assertEquals(40000, $accounts['1-1001']['cash_in']);
        foreach ($report['cash_accounts'] as $account) {
            $this->assertEqualsWithDelta($account['opening'] + $account['cash_in'] - $account['cash_out'], $account['closing'], 0.001);
        }

        $moves = collect($report['cash_movements'])->keyBy('reference_type');
        $this->assertFalse($moves->has('ACCOUNT_OPENING'));
        $this->assertEquals(100000, $moves['POS_SALE']['cash_in']);
        $this->assertEquals(30000, $moves['EXPENSE']['cash_out']);
        $this->assertEquals(40000, $moves['CASH_DEPOSIT']['cash_in']);
        $this->assertEquals(40000, $moves['CASH_DEPOSIT']['cash_out']);
        $this->assertEquals(100000, $report['summary']['revenue']);
    }

    public function test_daily_cash_lists_notas_cashiers_expenses_and_shifts(): void
    {
        $date = '2020-05-02';
        $a = 'Kasir A '.uniqid();
        $b = 'Kasir B '.uniqid();
        $this->makeSale($date, $a, [['TUNAI', 100000]]);
        $this->makeSale($date, $a, [['TUNAI', 50000]], 'VOID');
        $this->makeSale($date, $b, [['QRIS', 70000]]);
        $category = ExpenseCategory::firstOrFail();
        foreach ([['ACTIVE', 25000], ['VOID', 10000]] as [$status, $amount]) {
            Expense::create([
                'reference' => 'DR-BKK-'.uniqid(), 'expense_date' => $date, 'category_id' => $category->id,
                'amount' => $amount, 'payment_method' => 'TUNAI', 'recipient_name' => 'PLN',
                'description' => 'uji '.$status, 'approved_by' => 'Owner', 'status' => $status,
            ]);
        }
        $owner = $this->actingAsRole('OWNER');
        $sessionId = $this->insertCashSession($owner, $date.' 08:00:00');
        $otherDay = $this->insertCashSession($owner, '2020-05-03 08:00:00');

        $data = $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertOk()->json('data');

        $this->assertSame('all', $data['scope']);
        $cashierA = collect($data['cashiers'])->firstWhere('cashier_name', $a);
        $this->assertSame(1, $cashierA['sales_count']);
        $this->assertEquals(100000, $cashierA['sales_total']);
        $this->assertSame(1, $cashierA['void_count']);
        $this->assertEquals(50000, $cashierA['void_total']);
        $this->assertEquals(100000, $cashierA['by_method']['TUNAI']);
        $this->assertEquals(70000, collect($data['cashiers'])->firstWhere('cashier_name', $b)['by_method']['QRIS']);

        $mine = collect($data['sales'])->whereIn('cashier_name', [$a, $b]);
        $this->assertCount(3, $mine);
        $this->assertContains('VOID', $mine->pluck('status')->all());

        $expenses = collect($data['expenses'])->filter(fn ($e) => str_starts_with($e['description'], 'uji '));
        $this->assertSame(['uji ACTIVE'], $expenses->pluck('description')->values()->all());

        $session = collect($data['cash_sessions'])->firstWhere('id', $sessionId);
        $this->assertSame($owner->name, $session['user_name']);
        $this->assertSame($date.' 08:00:00', $session['opened_at']);
        $this->assertEquals(300000, $session['expected_cash']);
        $this->assertEquals(-5000, $session['variance']);
        $this->assertSame('Uang kembalian kurang', $session['variance_reason']);
        $this->assertSame('PENDING_APPROVAL', $session['status']);
        $this->assertNull(collect($data['cash_sessions'])->firstWhere('id', $otherDay));
    }

    public function test_open_shift_shows_the_running_expected_cash(): void
    {
        $date = '2020-05-16';
        $owner = $this->actingAsRole('OWNER');
        $id = $this->insertCashSession($owner, $date.' 08:00:00', [
            'from_entry_id' => (int) JournalEntry::max('id'), 'expected_cash' => null, 'counted_cash' => null,
            'variance' => null, 'variance_reason' => null, 'status' => 'OPEN',
        ]);
        $this->postJournal($date, [['1-1000', 100000, 0], ['4-1000', 0, 100000]], 'POS_SALE');

        $session = collect(app(DailyReportService::class)->dailyCash($date)['cash_sessions'])->firstWhere('id', $id);

        // Shift berjalan: kas seharusnya = modal awal + mutasi laci sejak shift dibuka (rumus SP2).
        $this->assertEquals(300000, $session['expected_cash']);
        $this->assertNull($session['counted_cash']);
        $this->assertNull($session['variance']);
    }

    public function test_kasir_sees_only_own_notas_and_shifts_and_gudang_is_denied(): void
    {
        $date = '2020-05-09';
        $owner = $this->actingAsRole('OWNER');
        $kasir = $this->actingAsRole('KASIR');
        $this->makeSale($date, $kasir->name, [['TUNAI', 100000]]);
        $this->makeSale($date, 'Kasir Lain '.uniqid(), [['TUNAI', 999000]]);
        $mine = $this->insertCashSession($kasir, $date.' 08:00:00');
        $this->insertCashSession($owner, $date.' 09:00:00');

        $data = $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertOk()->json('data');

        $this->assertSame('cashier', $data['scope']);
        $this->assertSame($kasir->name, $data['cashier']);
        $this->assertNull($data['summary']);
        $this->assertNull($data['cash_accounts']);
        $this->assertNull($data['cash_movements']);
        $this->assertNull($data['expenses']);
        // Nota lama tanpa user_id dicocokkan lewat nama kasir; HPP tidak terlihat oleh kasir.
        $this->assertSame([$kasir->name], collect($data['sales'])->pluck('cashier_name')->unique()->values()->all());
        $this->assertSame([null], collect($data['sales'])->pluck('total_hpp')->unique()->values()->all());
        $this->assertSame([$kasir->name], collect($data['cashiers'])->pluck('cashier_name')->all());
        $this->assertSame([$mine], collect($data['cash_sessions'])->pluck('id')->all());

        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertForbidden();
    }

    private function makeUser(string $role, string $name): User
    {
        $tag = uniqid();

        return User::create([
            'name' => $name, 'username' => 'dr-'.$tag, 'email' => 'dr-'.$tag.'@omahban.test',
            'role' => $role, 'password' => 'secret-test', 'is_active' => true,
        ]);
    }

    public function test_kasir_scope_matches_the_user_not_the_display_name(): void
    {
        $date = '2020-05-23';
        $name = 'Kasir Kembar '.uniqid();
        $one = $this->makeUser('KASIR', $name);
        $two = $this->makeUser('KASIR', $name);
        $mine = $this->makeSale($date, $name, [['TUNAI', 100000]], user: $one);
        $this->makeSale($date, $name, [['QRIS', 70000]], user: $two);

        Sanctum::actingAs($one);
        $data = $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertOk()->json('data');

        $this->assertSame([$mine->id], collect($data['sales'])->pluck('id')->all());
        $this->assertCount(1, $data['cashiers']);
        $this->assertSame(1, $data['cashiers'][0]['sales_count']);
        $this->assertEquals(100000, $data['cashiers'][0]['sales_total']);

        // Seluruh toko: dua pengguna bernama sama tetap dua baris rekap.
        $all = app(DailyReportService::class)->dailyCash($date);
        $rows = collect($all['cashiers'])->where('cashier_name', $name);
        $this->assertCount(2, $rows);
        $this->assertEqualsCanonicalizing([100000, 70000], $rows->pluck('sales_total')->all());
        $this->assertEquals(40000, collect($all['sales'])->firstWhere('id', $mine->id)['total_hpp']);
    }

    public function test_renamed_kasir_still_sees_own_notas_under_the_current_name(): void
    {
        $date = '2020-05-30';
        $kasir = $this->makeUser('KASIR', 'Nama Lama '.uniqid());
        $sale = $this->makeSale($date, $kasir->name, [['TUNAI', 100000]], user: $kasir);
        $kasir->update(['name' => 'Nama Baru '.uniqid()]);

        Sanctum::actingAs($kasir);
        $data = $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertOk()->json('data');

        $this->assertSame([$sale->id], collect($data['sales'])->pluck('id')->all());
        $this->assertSame([$kasir->name], collect($data['cashiers'])->pluck('cashier_name')->all());
        $this->assertSame($kasir->name, collect(app(DailyReportService::class)->dailyCash($date)['cashiers'])
            ->firstWhere('sales_total', 100000)['cashier_name']);
    }

    public function test_daily_cash_date_rules_and_financial_reports_scope(): void
    {
        $this->getJson('/api/v1/reports/daily-cash')->assertOk()->assertJsonPath('data.date', now()->toDateString());
        $this->getJson('/api/v1/reports/daily-cash?date=2020-13-45')->assertStatus(422)->assertJsonValidationErrors('date');

        // Peran selain Owner yang diberi laporan keuangan melihat seluruh toko.
        DB::table('role_permissions')->updateOrInsert(
            ['role' => 'KASIR', 'permission_key' => 'financial_reports'],
            ['allowed' => true, 'created_at' => now(), 'updated_at' => now()]
        );
        $this->actingAsRole('KASIR');
        $data = $this->getJson('/api/v1/reports/daily-cash?date=2020-05-02')->assertOk()->json('data');
        $this->assertSame('all', $data['scope']);
        $this->assertNull($data['cashier']);
        $this->assertIsArray($data['cash_accounts']);
    }
}
