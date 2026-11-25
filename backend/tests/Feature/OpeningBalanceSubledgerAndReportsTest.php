<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Product;
use App\Models\Supplier;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\TestCase;

class OpeningBalanceSubledgerAndReportsTest extends TestCase
{
    use AlignsInventoryLedger;
    use DatabaseTransactions;

    public function test_coa_sync_allows_custom_balance_sheet_accounts_and_incremental_opening_entries(): void
    {
        // Tambah akun neraca baru di COA: Kas Kecil (1-1005) & Utang Bank (2-2000).
        $this->postJson('/api/v1/accounts', [
            'account_code' => '1-1005',
            'account_name' => 'Kas Kecil Toko',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
        ])->assertCreated();

        $this->postJson('/api/v1/accounts', [
            'account_code' => '2-2000',
            'account_name' => 'Utang Bank Jangka Panjang',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
        ])->assertCreated();

        // Keduanya langsung tersinkronisasi di ringkasan saldo awal COA.
        $summary = $this->getJson('/api/v1/accounting/opening-balance/summary')->assertOk()->json('data');
        $byCode = collect($summary['accounts'])->keyBy('account_code');
        $this->assertTrue($byCode['1-1005']['can_direct_input']);
        $this->assertTrue($byCode['2-2000']['can_direct_input']);
        $this->assertFalse($byCode['1-2000']['can_direct_input']);
        $this->assertSame('inventory', $byCode['1-2000']['subledger_kind']);
        $this->assertSame('receivables', $byCode['1-1002']['subledger_kind']);
        $this->assertSame('payables', $byCode['2-1000']['subledger_kind']);

        // Posting saldo awal pertama termasuk akun kustom & 1-1100.
        $this->postJson('/api/v1/accounting/opening-balance', [
            'date' => '2026-06-01',
            'balances' => [
                '1-1000' => 2000000,
                '1-1005' => 500000,
                '1-1100' => 1200000,
                '2-2000' => 1000000,
            ],
        ])->assertCreated();

        // Posting tambahan di tanggal berikutnya (sinkronisasi/input harian) dengan allow_additional = true.
        $this->postJson('/api/v1/accounting/opening-balance', [
            'date' => '2026-06-02',
            'allow_additional' => true,
            'notes' => 'Tambahan saldo awal Bank BCA',
            'balances' => ['1-1001' => 15000000],
        ])->assertCreated();

        $after = $this->getJson('/api/v1/accounting/opening-balance/summary')->assertOk()->json('data');
        $this->assertTrue($after['totals']['is_balanced']);
        $this->assertEquals(0.0, $after['totals']['equation_difference']);
        $this->assertEquals(
            $after['totals']['total_assets'],
            round($after['totals']['total_liabilities'] + $after['totals']['total_equity'], 2)
        );
    }

    public function test_opening_inventory_receivable_payable_and_six_column_trial_balance_parity(): void
    {
        $this->alignInventoryLedger();

        $product = Product::create([
            'product_name' => 'Ban Saldo Awal '.uniqid(),
            'product_code' => 'SA-PRD-'.uniqid(),
            'barcode' => 'BC-SA-'.uniqid(),
            'brand' => 'Bridgestone',
            'product_cost' => 600000,
            'product_price' => 850000,
            'product_quantity' => 0,
        ]);

        $supplier = Supplier::create([
            'supplier_code' => 'SUP-SA-'.uniqid(),
            'supplier_name' => 'PT Distributor Saldo Awal',
            'phone' => '08123456789',
            'payment_terms_days' => 30,
            'is_active' => true,
        ]);

        // 1. Saldo awal akun (Kas & Bank) tgl 2026-06-01
        $this->postJson('/api/v1/accounting/opening-balance', [
            'date' => '2026-06-01',
            'balances' => ['1-1000' => 5000000, '1-1001' => 20000000],
        ])->assertCreated();

        // 2. Saldo awal persediaan FIFO (5 pcs @ Rp 600.000 = Rp 3.000.000)
        $invRes = $this->postJson('/api/v1/accounting/opening-balance/inventory', [
            'date' => '2026-06-01',
            'notes' => 'Stok awal ban baru',
            'items' => [['product_id' => $product->id, 'quantity' => 5, 'unit_cost' => 600000]],
        ])->assertCreated();
        $this->assertEquals(3000000, $invRes->json('data.total_value'));
        $this->assertSame(5, $product->fresh()->product_quantity);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        // 3. Saldo awal piutang (Rp 4.000.000)
        $recRes = $this->postJson('/api/v1/accounting/opening-balance/receivables', [
            'customer_name' => 'CV Armada Magelang',
            'invoice_number' => 'INV-OLD-01',
            'receivable_date' => '2026-06-01',
            'due_date' => '2026-06-30',
            'amount' => 4000000,
        ])->assertCreated();
        $recId = $recRes->json('data.receivable.id');
        $this->assertEquals(4000000, $recRes->json('data.receivable.remaining_amount'));

        // 4. Saldo awal utang supplier (Rp 7.000.000)
        $payRes = $this->postJson('/api/v1/accounting/opening-balance/payables', [
            'supplier_id' => $supplier->id,
            'supplier_invoice' => 'SUP-OLD-88',
            'payable_date' => '2026-06-01',
            'due_date' => '2026-06-30',
            'amount' => 7000000,
        ])->assertCreated();
        $purchaseId = $payRes->json('data.purchase.id');
        $this->assertStringStartsWith('SA-HUT-', $payRes->json('data.purchase.purchase_number'));

        // 5. Mutasi operasional dalam bulan yang sama (2026-06-10):
        //    - Terima pelunasan piutang Rp 1.500.000 masuk Bank BCA (1-1001)
        $this->postJson("/api/v1/accounting/opening-balance/receivables/{$recId}/payments", [
            'payment_date' => '2026-06-10',
            'amount' => 1500000,
            'account_code' => '1-1001',
            'notes' => 'Transfer sebagian piutang',
        ])->assertCreated()
            ->assertJsonPath('data.receivable.status', 'SEBAGIAN')
            ->assertJsonPath('data.receivable.remaining_amount', 2500000);

        //    - Bayar utang saldo awal Rp 2.000.000 via Bank BCA (1-1001)
        $this->postJson("/api/v1/purchases/{$purchaseId}/payments", [
            'payment_date' => '2026-06-10',
            'amount' => 2000000,
            'account_code' => '1-1001',
            'notes' => 'Cicilan saldo awal utang',
        ])->assertCreated();

        // 6. Verifikasi Neraca Saldo 6 Kolom untuk Juni 2026 (2026-06-01..2026-06-30)
        $tb = $this->getJson('/api/v1/accounting/trial-balance?start_date=2026-06-01&end_date=2026-06-30')
            ->assertOk()
            ->json('data');

        $this->assertTrue($tb['is_balanced']);
        $this->assertEquals($tb['total_opening_debit'], $tb['total_opening_credit']);
        $this->assertEquals($tb['total_mutation_debit'], $tb['total_mutation_credit']);
        $this->assertEquals($tb['total_debit'], $tb['total_credit']);

        $tbByCode = collect($tb['accounts'])->keyBy('account_code');

        // 7. Verifikasi paritas 100% antara Neraca Saldo 6 kolom dan Buku Besar untuk 1-2000, 1-1002, 2-1000
        foreach (['1-2000', '1-1002', '2-1000'] as $code) {
            $tbRow = $tbByCode[$code];
            $gl = $this->getJson("/api/v1/accounting/general-ledger?account_code={$code}&start_date=2026-06-01&end_date=2026-06-30")
                ->assertOk()
                ->json('data');

            $sign = $tbRow['normal_balance'] === 'DEBIT' ? 1 : -1;
            $tbOpeningSigned = round($sign * ($tbRow['opening_debit'] - $tbRow['opening_credit']), 2);
            $tbEndingSigned = round($sign * ($tbRow['debit'] - $tbRow['credit']), 2);

            $this->assertEquals($tbOpeningSigned, $gl['opening_balance'], "Saldo awal {$code} harus sama di Neraca Saldo & Buku Besar");
            $this->assertEquals($tbRow['mutation_debit'], $gl['total_debit'], "Mutasi debit {$code} harus sama");
            $this->assertEquals($tbRow['mutation_credit'], $gl['total_credit'], "Mutasi kredit {$code} harus sama");
            $this->assertEquals($tbEndingSigned, $gl['ending_balance'], "Saldo akhir {$code} harus sama");
            $this->assertNotEmpty($gl['opening_entries'], "Buku Besar {$code} harus memuat rincian jurnal saldo awal");
        }

        // Cek angka spesifik piutang 1-1002: awal 4jt, mutasi kredit 1.5jt, akhir 2.5jt
        $glAr = $this->getJson('/api/v1/accounting/general-ledger?account_code=1-1002&start_date=2026-06-01&end_date=2026-06-30')
            ->assertOk()->json('data');
        $this->assertEquals(4000000, $glAr['opening_balance']);
        $this->assertEquals(0, $glAr['total_debit']);
        $this->assertEquals(1500000, $glAr['total_credit']);
        $this->assertEquals(2500000, $glAr['ending_balance']);

        // Cek CALK mencatat piutang pelanggan & cocok dengan 1-1002
        $calk = $this->getJson('/api/v1/reports/calk?period=2026-06')->assertOk()->json('data');
        $this->assertEquals(2500000, $calk['notes']['receivables']['subledger_total']);
        $this->assertEquals(2500000, $calk['notes']['receivables']['ledger_balance']);
    }

    public function test_receivable_payment_validation_and_permissions(): void
    {
        $recRes = $this->postJson('/api/v1/accounting/opening-balance/receivables', [
            'customer_name' => 'Toko Ban Jaya',
            'receivable_date' => '2026-06-05',
            'amount' => 1000000,
        ])->assertCreated();
        $recId = $recRes->json('data.receivable.id');

        // Pembayaran melebihi sisa ditolak 422
        $this->postJson("/api/v1/accounting/opening-balance/receivables/{$recId}/payments", [
            'payment_date' => '2026-06-06',
            'amount' => 1500000,
            'account_code' => '1-1000',
        ])->assertStatus(422);

        // Pembayaran sebelum tanggal piutang ditolak 422
        $this->postJson("/api/v1/accounting/opening-balance/receivables/{$recId}/payments", [
            'payment_date' => '2026-06-01',
            'amount' => 500000,
            'account_code' => '1-1000',
        ])->assertStatus(422);

        // KASIR tidak boleh mengakses endpoint saldo awal
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/opening-balance/summary')->assertForbidden();
        $this->getJson('/api/v1/accounting/opening-balance/receivables')->assertForbidden();
        $this->getJson('/api/v1/accounting/opening-balance/payables')->assertForbidden();
        $this->postJson('/api/v1/accounting/opening-balance/inventory', ['date' => '2026-06-01', 'items' => []])->assertForbidden();
        $this->postJson('/api/v1/accounting/opening-balance/receivables', ['customer_name' => 'A', 'receivable_date' => '2026-06-01', 'amount' => 100])->assertForbidden();
        $this->postJson('/api/v1/accounting/opening-balance/payables', ['supplier_name' => 'B', 'payable_date' => '2026-06-01', 'amount' => 100])->assertForbidden();
    }

    public function test_supplier_payable_can_be_paid_directly_by_owner_capital_without_touching_cash(): void
    {
        $payRes = $this->postJson('/api/v1/accounting/opening-balance/payables', [
            'supplier_name' => 'PT Bridgestone Pusat',
            'payable_date' => '2026-07-01',
            'due_date' => '2026-07-31',
            'amount' => 12000000,
        ])->assertCreated();
        $purchaseId = $payRes->json('data.purchase.id');

        $cashBefore = $this->getJson('/api/v1/accounting/cash-balances')->assertOk()->json('data');

        // Pelunasan langsung oleh Owner via 3-1000 (Modal Disetor Pemilik)
        $settlement = $this->postJson("/api/v1/purchases/{$purchaseId}/payments", [
            'payment_date' => '2026-07-15',
            'amount' => 12000000,
            'account_code' => '3-1000',
            'notes' => 'Dibayar langsung oleh Owner dari rekening pusat',
        ])->assertCreated();

        $this->assertSame('LUNAS', $settlement->json('data.purchase.status'));
        $lines = collect($settlement->json('data.journal.lines'))->keyBy('account_code');
        $this->assertEquals(12000000, $lines['2-1000']['debit']);
        $this->assertEquals(12000000, $lines['3-1000']['credit']);

        // Kas laci (1-1000) dan Bank BCA (1-1001) tidak berkurang sama sekali
        $cashAfter = $this->getJson('/api/v1/accounting/cash-balances')->assertOk()->json('data');
        $this->assertEquals($cashBefore, $cashAfter);

        // Laporan perubahan ekuitas & arus kas tetap cocok (difference = 0, is_reconciled = true)
        $fs = $this->getJson('/api/v1/accounting/financial-statements?start_date=2026-07-01&end_date=2026-07-31')
            ->assertOk()->json('data');
        $this->assertEquals(0, $fs['equity_changes']['difference']);
        $this->assertTrue($fs['balance_sheet']['is_balanced']);

        $cf = $this->getJson('/api/v1/accounting/cash-flow?start_date=2026-07-01&end_date=2026-07-31')
            ->assertOk()->json('data');
        $this->assertTrue($cf['is_reconciled']);
    }
}
