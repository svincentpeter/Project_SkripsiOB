<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('product_price_audits')) {
            Schema::create('product_price_audits', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('product_id')->index();
                $table->decimal('old_cost', 15, 2)->default(0.00);
                $table->decimal('new_cost', 15, 2)->default(0.00);
                $table->decimal('old_price', 15, 2)->default(0.00);
                $table->decimal('new_price', 15, 2)->default(0.00);
                $table->decimal('cost_change_percent', 8, 2)->nullable();
                $table->decimal('price_change_percent', 8, 2)->nullable();
                $table->string('change_source', 50)->default('manual');
                $table->string('changed_field', 50)->nullable();
                $table->string('context_month', 20)->nullable();
                $table->unsignedBigInteger('changed_by')->nullable();
                $table->string('reason', 255)->nullable();
                $table->timestamps();

                $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_price_audits');
    }
};
