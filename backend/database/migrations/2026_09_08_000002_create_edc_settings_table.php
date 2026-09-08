<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('edc_settings')) {
            Schema::create('edc_settings', function (Blueprint $table) {
                $table->id();
                $table->string('bank_name', 100);
                $table->string('payment_type', 50); // 'Debit' or 'Credit'
                $table->decimal('fee_percentage', 5, 2)->default(0.00);
                $table->boolean('charge_to_customer')->default(false);
                $table->boolean('is_active')->default(true);
                $table->string('notes')->nullable();
                $table->timestamps();

                $table->unique(['bank_name', 'payment_type']);
                $table->index(['bank_name', 'is_active']);
            });

            // Initial seed data
            $now = now();
            DB::table('edc_settings')->insert([
                ['bank_name' => 'BCA', 'payment_type' => 'Debit', 'fee_percentage' => 0.15, 'charge_to_customer' => false, 'is_active' => true, 'notes' => 'Fee debit toko 0.15%', 'created_at' => $now, 'updated_at' => $now],
                ['bank_name' => 'BCA', 'payment_type' => 'Credit', 'fee_percentage' => 2.00, 'charge_to_customer' => true, 'is_active' => true, 'notes' => 'Surcharge kredit pelanggan 2.0%', 'created_at' => $now, 'updated_at' => $now],
                ['bank_name' => 'Mandiri', 'payment_type' => 'Debit', 'fee_percentage' => 0.15, 'charge_to_customer' => false, 'is_active' => true, 'notes' => 'Fee debit toko 0.15%', 'created_at' => $now, 'updated_at' => $now],
                ['bank_name' => 'Mandiri', 'payment_type' => 'Credit', 'fee_percentage' => 1.80, 'charge_to_customer' => true, 'is_active' => true, 'notes' => 'Surcharge kredit pelanggan 1.8%', 'created_at' => $now, 'updated_at' => $now],
                ['bank_name' => 'BRI', 'payment_type' => 'Debit', 'fee_percentage' => 0.15, 'charge_to_customer' => false, 'is_active' => true, 'notes' => 'Fee debit toko 0.15%', 'created_at' => $now, 'updated_at' => $now],
                ['bank_name' => 'BRI', 'payment_type' => 'Credit', 'fee_percentage' => 2.00, 'charge_to_customer' => true, 'is_active' => true, 'notes' => 'Surcharge kredit pelanggan 2.0%', 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('edc_settings');
    }
};
