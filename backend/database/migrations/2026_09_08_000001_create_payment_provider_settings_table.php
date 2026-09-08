<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payment_provider_settings')) {
            Schema::create('payment_provider_settings', function (Blueprint $table) {
                $table->id();
                $table->enum('method_type', ['bank', 'qris']);
                $table->string('provider_name', 100);
                $table->string('provider_code', 50)->nullable();
                $table->decimal('fee_percentage', 5, 2)->default(0.00);
                $table->decimal('fee_threshold_amount', 15, 2)->default(500000.00);
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->string('notes')->nullable();
                $table->timestamps();

                $table->unique(['method_type', 'provider_name']);
                $table->index(['method_type', 'is_active']);
            });

            // Initial seed data
            $now = now();
            DB::table('payment_provider_settings')->insert([
                // Bank Transfer
                ['method_type' => 'bank', 'provider_name' => 'BCA', 'provider_code' => 'BCA', 'fee_percentage' => 0.00, 'fee_threshold_amount' => 0.00, 'is_active' => true, 'sort_order' => 1, 'notes' => 'Rekening Utama Operasional', 'created_at' => $now, 'updated_at' => $now],
                ['method_type' => 'bank', 'provider_name' => 'Mandiri', 'provider_code' => 'MDR', 'fee_percentage' => 0.00, 'fee_threshold_amount' => 0.00, 'is_active' => true, 'sort_order' => 2, 'notes' => 'Rekening Penerimaan', 'created_at' => $now, 'updated_at' => $now],
                ['method_type' => 'bank', 'provider_name' => 'BNI', 'provider_code' => 'BNI', 'fee_percentage' => 0.00, 'fee_threshold_amount' => 0.00, 'is_active' => true, 'sort_order' => 3, 'notes' => 'Rekening Penerimaan', 'created_at' => $now, 'updated_at' => $now],
                ['method_type' => 'bank', 'provider_name' => 'BRI', 'provider_code' => 'BRI', 'fee_percentage' => 0.00, 'fee_threshold_amount' => 0.00, 'is_active' => true, 'sort_order' => 4, 'notes' => 'Rekening Penerimaan', 'created_at' => $now, 'updated_at' => $now],
                // QRIS Providers
                ['method_type' => 'qris', 'provider_name' => 'BCA', 'provider_code' => 'BCA', 'fee_percentage' => 0.30, 'fee_threshold_amount' => 500000.00, 'is_active' => true, 'sort_order' => 1, 'notes' => 'MDR 0.3% toko jika > 500rb', 'created_at' => $now, 'updated_at' => $now],
                ['method_type' => 'qris', 'provider_name' => 'Mandiri', 'provider_code' => 'MDR', 'fee_percentage' => 0.30, 'fee_threshold_amount' => 500000.00, 'is_active' => true, 'sort_order' => 2, 'notes' => 'MDR 0.3% toko jika > 500rb', 'created_at' => $now, 'updated_at' => $now],
                ['method_type' => 'qris', 'provider_name' => 'GoPay', 'provider_code' => 'GOPAY', 'fee_percentage' => 0.30, 'fee_threshold_amount' => 500000.00, 'is_active' => true, 'sort_order' => 3, 'notes' => 'MDR 0.3% toko jika > 500rb', 'created_at' => $now, 'updated_at' => $now],
                ['method_type' => 'qris', 'provider_name' => 'OVO', 'provider_code' => 'OVO', 'fee_percentage' => 0.30, 'fee_threshold_amount' => 500000.00, 'is_active' => true, 'sort_order' => 4, 'notes' => 'MDR 0.3% toko jika > 500rb', 'created_at' => $now, 'updated_at' => $now],
                ['method_type' => 'qris', 'provider_name' => 'DANA', 'provider_code' => 'DANA', 'fee_percentage' => 0.30, 'fee_threshold_amount' => 500000.00, 'is_active' => true, 'sort_order' => 5, 'notes' => 'MDR 0.3% toko jika > 500rb', 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_provider_settings');
    }
};
