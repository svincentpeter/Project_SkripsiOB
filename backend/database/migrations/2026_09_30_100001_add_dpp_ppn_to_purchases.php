<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DPP dan PPN faktur supplier disimpan di header pembelian. Toko non-PKP: PPN ikut menjadi modal
 * persediaan (1-2000), jadi kolom ini hanya informasi faktur, bukan akun PPN Masukan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->decimal('dpp_amount', 15, 2)->default(0)->after('total_amount');
            $table->decimal('ppn_amount', 15, 2)->default(0)->after('dpp_amount');
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['dpp_amount', 'ppn_amount']);
        });
    }
};
