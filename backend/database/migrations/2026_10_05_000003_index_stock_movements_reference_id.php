<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DocumentNumber::next(StockMovement, 'reference_id', 'OPN') memfilter LIKE 'OPN-YYYYMM-%' FOR UPDATE. Tanpa indeks
 * kueri itu mengunci seluruh tabel (menunggu setiap mutasi stok yang belum commit). Indeks satu kolom karena filternya
 * hanya reference_id; prefiks LIKE tetap memakai indeks.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index('reference_id');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex(['reference_id']);
        });
    }
};
