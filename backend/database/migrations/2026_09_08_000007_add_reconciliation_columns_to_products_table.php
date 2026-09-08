<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'brand_id')) {
                $table->unsignedBigInteger('brand_id')->nullable()->after('brand')->index();
            }
            if (!Schema::hasColumn('products', 'category_id')) {
                $table->unsignedBigInteger('category_id')->nullable()->default(1)->after('brand_id');
            }
            if (!Schema::hasColumn('products', 'stok_awal')) {
                $table->integer('stok_awal')->default(0)->after('product_quantity');
            }
            if (!Schema::hasColumn('products', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('product_stock_alert');
            }
            if (!Schema::hasColumn('products', 'is_old_stock')) {
                $table->boolean('is_old_stock')->default(false)->after('is_active');
            }
            if (!Schema::hasColumn('products', 'reference_price')) {
                $table->decimal('reference_price', 15, 2)->nullable()->after('product_price');
            }
            if (!Schema::hasColumn('products', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $cols = ['brand_id', 'category_id', 'stok_awal', 'is_active', 'is_old_stock', 'reference_price', 'deleted_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
