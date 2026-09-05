<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Products
        if (!Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->string('product_name', 150);
                $table->string('product_code', 50)->unique();
                $table->string('barcode', 50)->unique();
                $table->string('brand', 50)->index();
                $table->unsignedInteger('size_width')->nullable();
                $table->unsignedInteger('size_ratio')->nullable();
                $table->string('ring', 10)->nullable();
                $table->string('product_size', 30)->nullable();
                $table->string('motif', 80)->nullable();
                $table->string('condition_code', 20)->default('BARU');
                $table->string('product_year', 10)->default('2026');
                $table->decimal('product_cost', 15, 2)->default(0.00);
                $table->decimal('product_price', 15, 2)->default(0.00);
                $table->integer('product_quantity')->default(0);
                $table->integer('product_stock_alert')->default(5);
                $table->unsignedInteger('branch_id')->default(3)->index();
                $table->timestamps();
            });
        }

        // 2. Product Batches (FIFO)
        if (!Schema::hasTable('product_batches')) {
            Schema::create('product_batches', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('product_id')->index();
                $table->string('batch_code', 50)->unique();
                $table->string('source_name', 150);
                $table->date('purchase_date');
                $table->decimal('batch_cost', 15, 2);
                $table->unsignedInteger('initial_qty');
                $table->unsignedInteger('remaining_qty');
                $table->unsignedInteger('branch_id')->default(3);
                $table->timestamps();

                $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            });
        }

        // 3. Service Masters
        if (!Schema::hasTable('service_masters')) {
            Schema::create('service_masters', function (Blueprint $table) {
                $table->id();
                $table->string('service_code', 50)->unique();
                $table->string('service_name', 150);
                $table->string('category', 50);
                $table->decimal('standard_price', 15, 2)->default(0.00);
                $table->decimal('cost_price', 15, 2)->default(0.00);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 4. Suppliers
        if (!Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->string('supplier_code', 50)->unique();
                $table->string('supplier_name', 150);
                $table->string('phone', 30);
                $table->string('email', 100)->nullable();
                $table->text('address')->nullable();
                $table->string('contact_person', 100)->nullable();
                $table->integer('payment_terms_days')->default(30);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 5. Sales
        if (!Schema::hasTable('sales')) {
            Schema::create('sales', function (Blueprint $table) {
                $table->id();
                $table->string('reference', 50)->unique();
                $table->date('date')->index();
                $table->string('customer_name', 100)->default('Pelanggan Walk-In');
                $table->string('vehicle_plate', 30)->default('Umum');
                $table->string('cashier_name', 80)->default('Fani A.');
                $table->decimal('gross_sales_amount', 15, 2)->default(0.00);
                $table->decimal('discount_amount', 15, 2)->default(0.00);
                $table->decimal('tax_percentage', 5, 2)->default(0.00);
                $table->decimal('tax_amount', 15, 2)->default(0.00);
                $table->decimal('total_amount', 15, 2)->default(0.00);
                $table->decimal('paid_amount', 15, 2)->default(0.00);
                $table->string('payment_method', 30);
                $table->string('payment_reference', 100)->nullable();
                $table->decimal('total_hpp', 15, 2)->default(0.00);
                $table->decimal('total_profit', 15, 2)->default(0.00);
                $table->text('notes')->nullable();
                $table->string('status', 20)->default('LUNAS');
                $table->boolean('stock_deducted')->default(true);
                $table->unsignedInteger('branch_id')->default(3)->index();
                $table->timestamps();
            });
        }

        // 6. Sale Details
        if (!Schema::hasTable('sale_details')) {
            Schema::create('sale_details', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('sale_id')->index();
                $table->unsignedBigInteger('product_id')->nullable()->index();
                $table->unsignedInteger('quantity');
                $table->decimal('unit_price', 15, 2);
                $table->decimal('sub_total', 15, 2);
                $table->decimal('unit_cost_hpp', 15, 2)->default(0.00);
                $table->decimal('total_cost_hpp', 15, 2)->default(0.00);
                $table->decimal('discount_amount', 15, 2)->default(0.00);
                $table->decimal('profit_amount', 15, 2)->default(0.00);
                $table->timestamps();

                $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            });
        }

        // 7. Sale Batch Allocations (FIFO Tracking)
        if (!Schema::hasTable('sale_batch_allocations')) {
            Schema::create('sale_batch_allocations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('sale_detail_id')->index();
                $table->unsignedBigInteger('product_batch_id')->index();
                $table->unsignedInteger('quantity_allocated');
                $table->decimal('unit_cost', 15, 2);
                $table->decimal('total_cost', 15, 2);
                $table->timestamps();

                $table->foreign('sale_detail_id')->references('id')->on('sale_details')->onDelete('cascade');
                $table->foreign('product_batch_id')->references('id')->on('product_batches')->onDelete('cascade');
            });
        }

        // 8. Sales Bookings (DP Uang Muka)
        if (!Schema::hasTable('sales_bookings')) {
            Schema::create('sales_bookings', function (Blueprint $table) {
                $table->id();
                $table->string('booking_number', 50)->unique();
                $table->date('date');
                $table->string('customer_name', 100);
                $table->string('customer_phone', 30);
                $table->string('vehicle_plate', 30);
                $table->string('vehicle_model', 60)->nullable();
                $table->decimal('estimated_total', 15, 2)->default(0.00);
                $table->decimal('dp_amount', 15, 2)->default(0.00);
                $table->decimal('remaining_amount', 15, 2)->default(0.00);
                $table->string('payment_method', 30)->default('TRANSFER_BCA');
                $table->text('notes')->nullable();
                $table->string('status', 20)->default('ACTIVE');
                $table->timestamps();
            });
        }

        // 9. Stock Movements
        if (!Schema::hasTable('stock_movements')) {
            Schema::create('stock_movements', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('product_id')->index();
                $table->string('movement_type', 20); // MASUK, KELUAR, PENYESUAIAN
                $table->integer('quantity');
                $table->integer('balance_after');
                $table->string('reference_type', 50);
                $table->string('reference_id', 50);
                $table->text('description')->nullable();
                $table->string('operator_name', 80)->nullable();
                $table->unsignedInteger('branch_id')->default(3);
                $table->timestamps();

                $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            });
        }

        // 10. Expense Categories
        if (!Schema::hasTable('expense_categories')) {
            Schema::create('expense_categories', function (Blueprint $table) {
                $table->id();
                $table->string('category_code', 20)->unique();
                $table->string('category_name', 100);
                $table->string('default_account_code', 20);
                $table->timestamps();
            });
        }

        // 11. Expenses
        if (!Schema::hasTable('expenses')) {
            Schema::create('expenses', function (Blueprint $table) {
                $table->id();
                $table->string('reference', 50)->unique();
                $table->date('expense_date');
                $table->unsignedBigInteger('category_id')->nullable()->index();
                $table->decimal('amount', 15, 2);
                $table->string('payment_method', 30);
                $table->string('bank_name', 50)->nullable();
                $table->string('recipient_name', 120);
                $table->text('description');
                $table->string('attachment_path', 255)->nullable();
                $table->string('approved_by', 80);
                $table->string('status', 20)->default('ACTIVE');
                $table->unsignedInteger('branch_id')->default(3);
                $table->timestamps();
            });
        }

        // 12. Accounts (COA SAK EMKM)
        if (!Schema::hasTable('accounts')) {
            Schema::create('accounts', function (Blueprint $table) {
                $table->id();
                $table->string('account_code', 20)->unique();
                $table->string('account_name', 120);
                $table->string('account_type', 30); // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
                $table->string('normal_balance', 10); // DEBIT, CREDIT
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 13. Journal Entries
        if (!Schema::hasTable('journal_entries')) {
            Schema::create('journal_entries', function (Blueprint $table) {
                $table->id();
                $table->string('entry_number', 50)->unique();
                $table->date('entry_date')->index();
                $table->string('reference_type', 50)->nullable();
                $table->string('reference_id', 50)->nullable()->index();
                $table->text('description');
                $table->decimal('total_debit', 15, 2)->default(0.00);
                $table->decimal('total_credit', 15, 2)->default(0.00);
                $table->string('status', 20)->default('POSTED');
                $table->unsignedInteger('branch_id')->default(3);
                $table->timestamps();
            });
        }

        // 14. Journal Items
        if (!Schema::hasTable('journal_items')) {
            Schema::create('journal_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('journal_entry_id')->index();
                $table->unsignedBigInteger('account_id')->index();
                $table->decimal('debit', 15, 2)->default(0.00);
                $table->decimal('credit', 15, 2)->default(0.00);
                $table->string('note', 255)->nullable();
                $table->timestamps();

                $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('cascade');
                $table->foreign('account_id')->references('id')->on('accounts');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_items');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('sales_bookings');
        Schema::dropIfExists('sale_batch_allocations');
        Schema::dropIfExists('sale_details');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('service_masters');
        Schema::dropIfExists('product_batches');
        Schema::dropIfExists('products');
    }
};
