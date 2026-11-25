<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            if (! Schema::hasColumn('brands', 'min_markup_percent')) {
                $table->decimal('min_markup_percent', 6, 2)->default(15.00)->after('is_partner');
            }
            if (! Schema::hasColumn('brands', 'default_markup_percent')) {
                $table->decimal('default_markup_percent', 6, 2)->default(15.00)->after('min_markup_percent');
            }
        });
    }

    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $cols = array_filter(
                ['min_markup_percent', 'default_markup_percent'],
                fn (string $c) => Schema::hasColumn('brands', $c)
            );
            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};
