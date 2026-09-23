<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dokumen penerimaan barang (pembelian) dan pelunasan hutang supplier per faktur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_number', 50)->unique();
            $table->unsignedBigInteger('supplier_id')->nullable()->index();
            $table->string('supplier_name', 150);
            $table->string('supplier_invoice', 100)->nullable();
            $table->date('purchase_date');
            $table->string('payment_method', 20);
            $table->date('due_date')->nullable();
            $table->decimal('total_amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('status', 20);
            $table->string('journal_entry_number', 50)->nullable();
            $table->string('notes', 255)->nullable();
            $table->string('operator_name', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('purchases')->cascadeOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('account_code', 20);
            $table->string('notes', 255)->nullable();
            $table->string('operator_name', 100)->nullable();
            $table->string('journal_entry_number', 50)->nullable();
            $table->timestamps();
        });

        Schema::table('product_batches', function (Blueprint $table) {
            $table->unsignedBigInteger('purchase_id')->nullable()->after('product_id');
        });
    }

    public function down(): void
    {
        Schema::table('product_batches', function (Blueprint $table) {
            $table->dropColumn('purchase_id');
        });
        Schema::dropIfExists('purchase_payments');
        Schema::dropIfExists('purchases');
    }
};
