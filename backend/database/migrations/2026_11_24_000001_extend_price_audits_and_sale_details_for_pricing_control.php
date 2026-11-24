<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Standar penentuan harga penjualan (minimal +15% dari HPP batch FIFO tertinggi),
 * pencatatan override harga kasir (darurat Rp 0 maupun permintaan reimburse pembeli),
 * serta Audit Log & Notifikasi Owner.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_details', function (Blueprint $table) {
            if (! Schema::hasColumn('sale_details', 'catalog_price')) {
                $table->decimal('catalog_price', 15, 2)->default(0)->after('unit_price');
            }
            if (! Schema::hasColumn('sale_details', 'reference_hpp')) {
                $table->decimal('reference_hpp', 15, 2)->default(0)->after('catalog_price');
            }
            if (! Schema::hasColumn('sale_details', 'price_override_type')) {
                $table->string('price_override_type', 40)->nullable()->after('discount_amount');
            }
            if (! Schema::hasColumn('sale_details', 'price_override_reason')) {
                $table->string('price_override_reason', 255)->nullable()->after('price_override_type');
            }
        });

        Schema::table('product_price_audits', function (Blueprint $table) {
            if (! Schema::hasColumn('product_price_audits', 'sale_id')) {
                $table->unsignedBigInteger('sale_id')->nullable()->after('product_id')->index();
                $table->foreign('sale_id')->references('id')->on('sales')->nullOnDelete();
            }
            if (! Schema::hasColumn('product_price_audits', 'sale_detail_id')) {
                $table->unsignedBigInteger('sale_detail_id')->nullable()->after('sale_id');
                $table->foreign('sale_detail_id')->references('id')->on('sale_details')->nullOnDelete();
            }
            if (! Schema::hasColumn('product_price_audits', 'reference_hpp')) {
                $table->decimal('reference_hpp', 15, 2)->default(0)->after('new_cost');
            }
            if (! Schema::hasColumn('product_price_audits', 'markup_percent')) {
                $table->decimal('markup_percent', 8, 2)->nullable()->after('price_change_percent');
            }
            if (! Schema::hasColumn('product_price_audits', 'actor_name')) {
                $table->string('actor_name', 100)->nullable()->after('changed_by');
            }
            if (! Schema::hasColumn('product_price_audits', 'actor_role')) {
                $table->string('actor_role', 30)->nullable()->after('actor_name')->index();
            }
            if (! Schema::hasColumn('product_price_audits', 'applies_to')) {
                $table->string('applies_to', 30)->default('CATALOG')->after('actor_role');
            }
            if (! Schema::hasColumn('product_price_audits', 'is_read_by_owner')) {
                $table->boolean('is_read_by_owner')->default(false)->after('reason')->index();
            }
            if (! Schema::hasColumn('product_price_audits', 'is_reviewed_by_owner')) {
                $table->boolean('is_reviewed_by_owner')->default(false)->after('is_read_by_owner')->index();
            }
            if (! Schema::hasColumn('product_price_audits', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('is_reviewed_by_owner');
            }
            if (! Schema::hasColumn('product_price_audits', 'reviewed_by')) {
                $table->unsignedBigInteger('reviewed_by')->nullable()->after('reviewed_at');
            }
            if (! Schema::hasColumn('product_price_audits', 'review_notes')) {
                $table->string('review_notes', 255)->nullable()->after('reviewed_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_price_audits', function (Blueprint $table) {
            if (Schema::hasColumn('product_price_audits', 'sale_id')) {
                $table->dropForeign(['sale_id']);
            }
            if (Schema::hasColumn('product_price_audits', 'sale_detail_id')) {
                $table->dropForeign(['sale_detail_id']);
            }
            $cols = array_filter([
                'sale_id', 'sale_detail_id', 'reference_hpp', 'markup_percent',
                'actor_name', 'actor_role', 'applies_to',
                'is_read_by_owner', 'is_reviewed_by_owner', 'reviewed_at', 'reviewed_by', 'review_notes',
            ], fn (string $c) => Schema::hasColumn('product_price_audits', $c));
            if ($cols) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('sale_details', function (Blueprint $table) {
            $cols = array_filter([
                'catalog_price', 'reference_hpp', 'price_override_type', 'price_override_reason',
            ], fn (string $c) => Schema::hasColumn('sale_details', $c));
            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};
