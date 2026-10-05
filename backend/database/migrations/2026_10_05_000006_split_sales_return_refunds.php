<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Refund retur mengikuti cara bayar nota: bagian tunai dari laci (1-1000), bagian QRIS/transfer dari Bank BCA
 * (1-1001). Retur tanpa bagian tunai tidak memerlukan shift, jadi cash_session_id boleh kosong. Retur lama
 * seluruhnya tunai dari laci.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_returns', function (Blueprint $table) {
            $table->decimal('refund_cash', 15, 2)->default(0)->after('refund_amount');
            $table->decimal('refund_bank', 15, 2)->default(0)->after('refund_cash');
            $table->foreignId('cash_session_id')->nullable()->change();
        });
        DB::table('sales_returns')->update(['refund_cash' => DB::raw('refund_amount')]);
    }

    public function down(): void
    {
        Schema::table('sales_returns', function (Blueprint $table) {
            $table->dropColumn(['refund_cash', 'refund_bank']);
        });
    }
};
