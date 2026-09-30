<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Satu baris per order QRIS dinamis Midtrans: nominal yang ditagih/lunas, sumber pelunasan, dan baris
 * pembayaran nota yang memakainya (unik: satu pelunasan hanya membayar satu nota).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qris_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 64)->unique();
            $table->decimal('gross_amount', 15, 2);
            $table->string('transaction_status', 20)->default('pending');
            $table->string('settlement_source', 20)->nullable(); // WEBHOOK | STATUS_API | SIMULATION
            $table->timestamp('settled_at')->nullable();
            $table->foreignId('sale_payment_id')->nullable()->unique()->constrained('sale_payments');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qris_transactions');
    }
};
