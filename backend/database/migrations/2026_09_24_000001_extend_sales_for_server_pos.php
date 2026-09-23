<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Siklus POS di server: pembayaran per baris (split), piutang BON, DP booking, dan void.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('customer_phone', 30)->nullable()->after('customer_name');
            $table->string('vehicle_model', 60)->nullable()->after('vehicle_plate');
            $table->decimal('change_amount', 15, 2)->default(0)->after('paid_amount');
            $table->decimal('dp_applied', 15, 2)->default(0)->after('change_amount');
            $table->unsignedBigInteger('booking_id')->nullable()->after('dp_applied');
            $table->date('due_date')->nullable()->after('status');
            $table->timestamp('voided_at')->nullable();
            $table->string('voided_by', 100)->nullable();
            $table->string('void_reason', 255)->nullable();
        });

        Schema::table('sale_details', function (Blueprint $table) {
            $table->string('item_type', 20)->default('PRODUCT')->after('product_id');
            $table->string('item_name', 200)->nullable()->after('item_type');
            $table->unsignedBigInteger('service_id')->nullable()->after('item_name');
            $table->boolean('is_manual')->default(false)->after('service_id');
        });

        Schema::table('sales_bookings', function (Blueprint $table) {
            $table->json('items')->nullable()->after('vehicle_model');
            $table->string('dp_account_code', 20)->nullable()->after('payment_method');
            $table->unsignedBigInteger('converted_sale_id')->nullable()->after('status');
            $table->timestamp('cancelled_at')->nullable();
            $table->string('operator_name', 100)->nullable();
        });

        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->string('method', 30);
            $table->string('account_code', 20);
            $table->decimal('amount', 15, 2);
            $table->decimal('tendered_amount', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->decimal('fee_percentage', 5, 2)->default(0);
            $table->decimal('fee_amount', 15, 2)->default(0);
            $table->decimal('surcharge_amount', 15, 2)->default(0);
            $table->decimal('net_received', 15, 2)->default(0);
            $table->string('provider_name', 100)->nullable();
            $table->string('edc_bank', 100)->nullable();
            $table->string('edc_type', 20)->nullable();
            $table->string('reference', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('receivable_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('account_code', 20);
            $table->string('notes', 255)->nullable();
            $table->string('operator_name', 100)->nullable();
            $table->string('journal_entry_number', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receivable_payments');
        Schema::dropIfExists('sale_payments');

        Schema::table('sales_bookings', function (Blueprint $table) {
            $table->dropColumn(['items', 'dp_account_code', 'converted_sale_id', 'cancelled_at', 'operator_name']);
        });

        Schema::table('sale_details', function (Blueprint $table) {
            $table->dropColumn(['item_type', 'item_name', 'service_id', 'is_manual']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn([
                'customer_phone', 'vehicle_model', 'change_amount', 'dp_applied', 'booking_id',
                'due_date', 'voided_at', 'voided_by', 'void_reason',
            ]);
        });
    }
};
