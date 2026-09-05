<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('size_width')->default(0)->change();
            $table->unsignedInteger('size_ratio')->default(0)->change();
            $table->string('ring', 10)->default('R15')->change();
            $table->string('product_size', 30)->default('-')->change();
            $table->string('motif', 80)->default('-')->change();
        });
    }

    public function down(): void
    {
        // No down needed
    }
};
