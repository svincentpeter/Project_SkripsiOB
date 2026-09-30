<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Register aset tetap (buku pembantu 1-3000/1-3999) dan rincian penyusutan per aset per bulan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fixed_assets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 150);
            $table->string('category', 30);
            $table->date('acquisition_date');
            $table->decimal('acquisition_cost', 15, 2);
            $table->decimal('residual_value', 15, 2)->default(0);
            $table->unsignedSmallInteger('useful_life_months');
            $table->char('depreciation_start', 7);
            $table->decimal('opening_accumulated_depreciation', 15, 2)->default(0);
            $table->string('funding', 10);
            $table->string('journal_entry_number', 50)->nullable();
            $table->string('status', 10)->default('ACTIVE');
            $table->string('notes', 255)->nullable();
            $table->string('void_reason', 255)->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });

        Schema::create('fixed_asset_depreciations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->char('period', 7);
            $table->decimal('amount', 15, 2);
            $table->foreignId('journal_entry_id')->constrained('journal_entries');
            $table->timestamps();
            $table->index(['fixed_asset_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixed_asset_depreciations');
        Schema::dropIfExists('fixed_assets');
    }
};
