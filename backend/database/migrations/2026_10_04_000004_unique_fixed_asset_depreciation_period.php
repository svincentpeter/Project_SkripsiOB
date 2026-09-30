<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Satu baris penyusutan per aset per bulan. Unique dibuat dulu agar FK fixed_asset_id tetap punya indeks
 * saat indeks biasa lama dihapus.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixed_asset_depreciations', function (Blueprint $table) {
            $table->unique(['fixed_asset_id', 'period']);
            $table->dropIndex(['fixed_asset_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::table('fixed_asset_depreciations', function (Blueprint $table) {
            $table->index(['fixed_asset_id', 'period']);
            $table->dropUnique(['fixed_asset_id', 'period']);
        });
    }
};
