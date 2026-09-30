<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retur pembelian & pembatalan penerimaan barang (RTB-…), per batch GR yang dikurangi. purchases.returned_amount
 * menampung nilai yang dikembalikan, sehingga sisa hutang = total − retur − dibayar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50)->unique();
            $table->foreignId('purchase_id')->constrained('purchases');
            $table->string('kind', 10);
            $table->date('return_date');
            $table->string('reason', 255);
            $table->unsignedInteger('quantity');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('payable_amount', 15, 2)->default(0);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->string('refund_account_code', 20)->nullable();
            $table->string('journal_entry_number', 50)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('operator_name', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_return_id')->constrained('purchase_returns')->cascadeOnDelete();
            $table->foreignId('product_batch_id')->nullable()->constrained('product_batches')->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('total_cost', 15, 2);
            $table->timestamps();
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->decimal('returned_amount', 15, 2)->default(0)->after('paid_amount');
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn('returned_amount');
        });
        Schema::dropIfExists('purchase_return_items');
        Schema::dropIfExists('purchase_returns');
    }
};
