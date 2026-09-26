<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Toko tidak memungut PPN atas penjualan (non-PKP). PPN hanya dihitung saat penerimaan barang
 * dan masuk ke harga pokok, jadi kolom pajak di `sales` dan akun 2-1003 PPN Keluaran dihapus.
 * Migrasi menolak jalan bila sudah ada data PPN agar tidak ada nilai yang hilang diam-diam.
 */
return new class extends Migration
{
    private const VAT_ACCOUNT = [
        'account_code' => '2-1003',
        'account_name' => 'PPN Keluaran (11%)',
        'account_type' => 'LIABILITY',
        'normal_balance' => 'CREDIT',
    ];

    public function up(): void
    {
        if (Schema::hasColumn('sales', 'tax_amount') && DB::table('sales')->where('tax_amount', '<>', 0)->exists()) {
            throw new RuntimeException('Masih ada penjualan dengan PPN; kolom pajak tidak dapat dihapus.');
        }

        $vatAccountUsed = DB::table('journal_items')
            ->join('accounts', 'accounts.id', '=', 'journal_items.account_id')
            ->where('accounts.account_code', self::VAT_ACCOUNT['account_code'])
            ->exists();
        if ($vatAccountUsed) {
            throw new RuntimeException('Akun 2-1003 sudah dipakai jurnal; tidak dapat dihapus.');
        }

        $columns = array_values(array_filter(['tax_percentage', 'tax_amount'], fn ($c) => Schema::hasColumn('sales', $c)));
        if ($columns) {
            Schema::table('sales', fn (Blueprint $table) => $table->dropColumn($columns));
        }

        DB::table('accounts')->where('account_code', self::VAT_ACCOUNT['account_code'])->delete();
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('tax_percentage', 5, 2)->default(0.00)->after('discount_amount');
            $table->decimal('tax_amount', 15, 2)->default(0.00)->after('tax_percentage');
        });

        if (! DB::table('accounts')->where('account_code', self::VAT_ACCOUNT['account_code'])->exists()) {
            DB::table('accounts')->insert(self::VAT_ACCOUNT + ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
};
