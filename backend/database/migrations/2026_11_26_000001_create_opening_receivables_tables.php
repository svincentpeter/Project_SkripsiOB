<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mengaktifkan kembali akun 1-1002 Piutang Dagang (AR) untuk pencatatan Saldo Awal Piutang
 * & Buku Pembantu Piutang (revisi dosen SAK EMKM), serta membuat tabel buku pembantu
 * saldo awal piutang dan pelunasannya.
 *
 * Catatan: Penjualan kredit (BON) di kasir POS tetap nonaktif; 2-1004 (DP) & 4-2000 (EDC) tetap nonaktif.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $exists = DB::table('accounts')->where('account_code', '1-1002')->exists();
        if ($exists) {
            DB::table('accounts')->where('account_code', '1-1002')->update([
                'is_active' => true,
                'updated_at' => $now,
            ]);
        } else {
            DB::table('accounts')->insert([
                'account_code' => '1-1002',
                'account_name' => 'Piutang Dagang (AR)',
                'account_type' => 'ASSET',
                'normal_balance' => 'DEBIT',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        if (! Schema::hasTable('opening_receivables')) {
            Schema::create('opening_receivables', function (Blueprint $table) {
                $table->id();
                $table->string('receivable_number', 50)->unique();
                $table->string('customer_name', 150);
                $table->string('customer_phone', 30)->nullable();
                $table->string('invoice_number', 100)->nullable();
                $table->date('receivable_date');
                $table->date('due_date')->nullable();
                $table->decimal('total_amount', 15, 2);
                $table->decimal('paid_amount', 15, 2)->default(0);
                $table->string('status', 20)->default('BELUM_LUNAS');
                $table->string('journal_entry_number', 50)->nullable();
                $table->string('notes', 255)->nullable();
                $table->string('operator_name', 100)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('opening_receivable_payments')) {
            Schema::create('opening_receivable_payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('opening_receivable_id')->constrained('opening_receivables')->cascadeOnDelete();
                $table->date('payment_date');
                $table->decimal('amount', 15, 2);
                $table->string('account_code', 20);
                $table->string('notes', 255)->nullable();
                $table->string('operator_name', 100)->nullable();
                $table->string('journal_entry_number', 50)->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_receivable_payments');
        Schema::dropIfExists('opening_receivables');
    }
};
