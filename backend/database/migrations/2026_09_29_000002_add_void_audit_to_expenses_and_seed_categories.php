<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak pembatalan beban dan kategori beban baku. Nama kategori sama persis dengan union
 * ExpenseCategory di frontend (src/shared/types/index.ts) agar pemetaan tidak bergantung pada id.
 */
return new class extends Migration
{
    private const CATEGORIES = [
        ['category_code' => 'GAJI', 'category_name' => 'Gaji & Uang Makan Montir', 'default_account_code' => '6-1000'],
        ['category_code' => 'LISTRIK', 'category_name' => 'Listrik & Air (PLN/PDAM)', 'default_account_code' => '6-1001'],
        ['category_code' => 'SEWA', 'category_name' => 'Sewa Lahan & Bangunan', 'default_account_code' => '6-1003'],
        ['category_code' => 'TRANSPORT', 'category_name' => 'Transport & Pengiriman Ban', 'default_account_code' => '6-1004'],
        ['category_code' => 'ATK', 'category_name' => 'ATK & Keperluan Bengkel', 'default_account_code' => '6-1005'],
        ['category_code' => 'MESIN', 'category_name' => 'Pemeliharaan Mesin Spooring & Balancing', 'default_account_code' => '6-1006'],
        ['category_code' => 'KONSUMSI', 'category_name' => 'Konsumsi & Lembur Karyawan', 'default_account_code' => '6-1007'],
        ['category_code' => 'PAJAK', 'category_name' => 'Pajak & Retribusi Daerah', 'default_account_code' => '6-1008'],
    ];

    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('void_reason', 255)->nullable()->after('status');
            $table->string('voided_by', 80)->nullable()->after('void_reason');
            $table->timestamp('voided_at')->nullable()->after('voided_by');
            $table->foreignId('created_by')->nullable()->after('branch_id')->constrained('users')->nullOnDelete();
        });

        foreach (self::CATEGORIES as $category) {
            DB::table('expense_categories')->updateOrInsert(
                ['category_code' => $category['category_code']],
                $category + ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['void_reason', 'voided_by', 'voided_at']);
        });

        DB::table('expense_categories')
            ->whereIn('category_code', array_column(self::CATEGORIES, 'category_code'))
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('expenses')->whereColumn('expenses.category_id', 'expense_categories.id'))
            ->delete();
    }
};
