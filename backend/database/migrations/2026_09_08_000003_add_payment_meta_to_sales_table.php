<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (!Schema::hasColumn('sales', 'payment_provider')) {
                $table->string('payment_provider', 100)->nullable()->after('payment_reference');
            }
            if (!Schema::hasColumn('sales', 'edc_bank')) {
                $table->string('edc_bank', 100)->nullable()->after('payment_provider');
            }
            if (!Schema::hasColumn('sales', 'edc_type')) {
                $table->string('edc_type', 50)->nullable()->after('edc_bank');
            }
            if (!Schema::hasColumn('sales', 'fee_percentage')) {
                $table->decimal('fee_percentage', 5, 2)->default(0.00)->after('edc_type');
            }
            if (!Schema::hasColumn('sales', 'fee_amount')) {
                $table->decimal('fee_amount', 15, 2)->default(0.00)->after('fee_percentage');
            }
            if (!Schema::hasColumn('sales', 'surcharge_amount')) {
                $table->decimal('surcharge_amount', 15, 2)->default(0.00)->after('fee_amount');
            }
            if (!Schema::hasColumn('sales', 'net_received')) {
                $table->decimal('net_received', 15, 2)->default(0.00)->after('surcharge_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn([
                'payment_provider',
                'edc_bank',
                'edc_type',
                'fee_percentage',
                'fee_amount',
                'surcharge_amount',
                'net_received',
            ]);
        });
    }
};
