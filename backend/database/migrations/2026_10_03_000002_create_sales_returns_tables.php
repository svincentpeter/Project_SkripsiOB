<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retur penjualan (RTJ-…): refund tunai dari laci pada satu shift kasir, per baris nota. quantity_returned pada
 * alokasi mencatat unit yang sudah kembali ke batch asal, agar retur sebagian tidak memulihkan lapisan dua kali.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50)->unique();
            $table->foreignId('sale_id')->constrained('sales');
            $table->date('return_date');
            $table->string('reason', 255);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->decimal('cost_amount', 15, 2)->default(0);
            $table->foreignId('cash_session_id')->constrained('cash_sessions');
            $table->string('journal_entry_number', 50)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('operator_name', 100)->nullable();
            $table->unsignedBigInteger('branch_id')->default(3);
            $table->timestamps();
        });

        Schema::create('sales_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->cascadeOnDelete();
            $table->foreignId('sale_detail_id')->constrained('sale_details');
            $table->unsignedInteger('quantity');
            $table->decimal('refund_amount', 15, 2);
            $table->decimal('cost_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::table('sale_batch_allocations', function (Blueprint $table) {
            $table->unsignedInteger('quantity_returned')->default(0)->after('quantity_allocated');
        });
    }

    public function down(): void
    {
        Schema::table('sale_batch_allocations', function (Blueprint $table) {
            $table->dropColumn('quantity_returned');
        });
        Schema::dropIfExists('sales_return_items');
        Schema::dropIfExists('sales_returns');
    }
};
