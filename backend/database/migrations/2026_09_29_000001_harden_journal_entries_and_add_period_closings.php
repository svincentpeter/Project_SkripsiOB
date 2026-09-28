<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak audit jurnal (pembuat, tautan jurnal pembalik) dan tabel tutup buku per periode.
 * Tanggal kunci = end_date terbesar yang belum dibuka kembali; jurnal bertanggal <= tanggal itu ditolak.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->after('branch_id')->constrained('users')->nullOnDelete();
            $table->foreignId('reversal_of_id')->nullable()->unique()->after('created_by')->constrained('journal_entries');
        });

        Schema::create('accounting_period_closings', function (Blueprint $table) {
            $table->id();
            $table->char('period', 7)->index();
            $table->date('end_date');
            $table->foreignId('closing_entry_id')->nullable()->constrained('journal_entries');
            $table->decimal('net_income', 15, 2)->default(0);
            $table->string('notes', 255)->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at');
            $table->timestamp('reopened_at')->nullable();
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reopen_reason', 255)->nullable();
            $table->foreignId('reopen_entry_id')->nullable()->constrained('journal_entries');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_period_closings');
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reversal_of_id');
            $table->dropConstrainedForeignId('created_by');
        });
    }
};
