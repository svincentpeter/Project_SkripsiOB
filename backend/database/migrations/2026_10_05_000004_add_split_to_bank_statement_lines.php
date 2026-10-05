<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Satu mutasi rekening koran (mis. setoran QRIS harian) dicocokkan ke beberapa baris jurnal bank: mutasi induk
 * ditandai is_split dan dipecah menjadi baris anak (parent_id), masing-masing cocok 1:1 dengan satu baris jurnal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bank_statement_lines', function (Blueprint $table) {
            $table->boolean('is_split')->default(false)->after('source');
            $table->foreignId('parent_id')->nullable()->after('is_split')->constrained('bank_statement_lines')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Gabungan dipulihkan menjadi mutasi induk yang belum dicocokkan sebelum kolomnya dibuang.
        DB::table('bank_statement_lines')->whereNotNull('parent_id')->delete();
        Schema::table('bank_statement_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn('is_split');
        });
    }
};
