<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mutasi rekening koran Bank BCA (1-1001) dan saldo akhir rekening koran per bulan untuk rekonsiliasi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_statement_lines', function (Blueprint $table) {
            $table->id();
            $table->date('statement_date')->index();
            $table->string('description', 255);
            $table->decimal('amount', 15, 2);
            $table->string('source', 10)->default('MANUAL');
            $table->foreignId('journal_item_id')->nullable()->unique()->constrained('journal_items')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });

        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->char('period', 7)->unique();
            $table->decimal('statement_ending_balance', 15, 2);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_reconciliations');
        Schema::dropIfExists('bank_statement_lines');
    }
};
