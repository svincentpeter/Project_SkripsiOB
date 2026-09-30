<?php

use App\Http\Controllers\Api\v1\AccountController;
use App\Http\Controllers\Api\v1\AdjustingEntryController;
use App\Http\Controllers\Api\v1\AccountingPeriodController;
use App\Http\Controllers\Api\v1\AccountingReportController;
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\FixedAssetController;
use App\Http\Controllers\Api\v1\CashMovementController;
use App\Http\Controllers\Api\v1\CashSessionController;
use App\Http\Controllers\Api\v1\ExpenseController;
use App\Http\Controllers\Api\v1\InventoryController;
use App\Http\Controllers\Api\v1\OpeningBalanceController;
use App\Http\Controllers\Api\v1\PaymentApiController;
use App\Http\Controllers\Api\v1\PaymentMethodSettingController;
use App\Http\Controllers\Api\v1\PosController;
use App\Http\Controllers\Api\v1\ProductCategoryController;
use App\Http\Controllers\Api\v1\ProductController;
use App\Http\Controllers\Api\v1\PurchaseController;
use App\Http\Controllers\Api\v1\ReportStockMonthlyApiController;
use App\Http\Controllers\Api\v1\RolePermissionController;
use App\Http\Controllers\Api\v1\ServiceCategoryController;
use App\Http\Controllers\Api\v1\ServiceMasterController;
use App\Http\Controllers\Api\v1\StockReconciliationApiController;
use App\Http\Controllers\Api\v1\SupplierController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ---------------------------------------------------------------
    // Publik: cek kesehatan, login, dan notifikasi server Midtrans
    // ---------------------------------------------------------------
    Route::get('/health', function () {
        try {
            DB::connection()->getPdo();
            $dbName = DB::connection()->getDatabaseName();
            $dbStatus = 'connected';
        } catch (\Throwable $e) {
            $dbName = null;
            $dbStatus = 'disconnected: ' . $e->getMessage();
        }

        return response()->json([
            'status' => 'healthy',
            'app' => 'Omah Ban POS & SIA SAK EMKM Cabang 3',
            'database' => $dbName,
            'database_status' => $dbStatus,
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('payment/midtrans/webhook', [PaymentApiController::class, 'handleWebhook']);

    // ---------------------------------------------------------------
    // Wajib login; akses dibatasi per kunci izin peran
    // ---------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('settings/role-permissions', [RolePermissionController::class, 'index']);
        Route::put('settings/role-permissions', [RolePermissionController::class, 'update'])->middleware('permission:role_settings');

        // Master data: dibaca kasir (katalog POS) & gudang, diubah oleh pengelola inventori
        Route::middleware('permission:pos,inventory_view')->group(function () {
            Route::apiResource('products', ProductController::class)->only(['index', 'show']);
            Route::apiResource('services', ServiceMasterController::class)->only(['index', 'show']);
            Route::apiResource('suppliers', SupplierController::class)->only(['index', 'show']);
            Route::get('product-categories', [ProductCategoryController::class, 'index']);
            Route::get('service-categories', [ServiceCategoryController::class, 'index']);
        });
        Route::get('accounts', [AccountController::class, 'index'])->middleware('permission:pos,inventory_view,accounting_hub,financial_reports,expenses');
        Route::middleware('permission:inventory_manage')->group(function () {
            Route::apiResource('products', ProductController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('services', ServiceMasterController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('suppliers', SupplierController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('product-categories', ProductCategoryController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('service-categories', ServiceCategoryController::class)->only(['store', 'update', 'destroy']);
        });

        // POS Kiosk & Transactions
        Route::middleware('permission:pos')->group(function () {
            Route::get('pos/payment-options', [PaymentMethodSettingController::class, 'getPaymentOptions']);
            Route::post('pos/checkout', [PosController::class, 'checkout']);

            Route::prefix('payment/qris')->group(function () {
                Route::post('charge', [PaymentApiController::class, 'chargeQris']);
                Route::get('status/{orderId}', [PaymentApiController::class, 'checkQrisStatus']);
                Route::post('simulate/{orderId}', [PaymentApiController::class, 'simulateQrisSettlement']);
            });
        });
        Route::middleware('permission:pos,receipt')->group(function () {
            Route::get('pos/transactions', [PosController::class, 'index']);
            Route::get('pos/transactions/{id}', [PosController::class, 'show']);
        });
        Route::post('pos/transactions/{id}/void', [PosController::class, 'void'])->middleware('permission:sale_void');
        Route::post('pos/transactions/{id}/returns', [PosController::class, 'salesReturn'])->middleware('permission:sales_return');

        // Shift kasir (satu laci = akun 1-1000); selisih kas dijurnal saat pemilik menyetujui
        Route::get('cash-sessions/current', [CashSessionController::class, 'current'])->middleware('permission:cash_session,cash_session_approve');
        Route::middleware('permission:cash_session')->group(function () {
            Route::post('cash-sessions/open', [CashSessionController::class, 'open']);
            Route::post('cash-sessions/{id}/close', [CashSessionController::class, 'close'])->whereNumber('id');
        });
        Route::middleware('permission:cash_session_approve')->group(function () {
            Route::get('cash-sessions', [CashSessionController::class, 'index']);
            Route::post('cash-sessions/{id}/approve', [CashSessionController::class, 'approve'])->whereNumber('id');
        });

        // Mutasi kas pemilik: setor bank, prive, setoran modal
        Route::middleware('permission:cash_movement')->group(function () {
            Route::get('cash-movements', [CashMovementController::class, 'index']);
            Route::post('cash-movements', [CashMovementController::class, 'store']);
        });

        // Pengaturan rekening transfer & provider QRIS (EDC tidak lagi didukung)
        Route::get('settings/payment-providers', [PaymentMethodSettingController::class, 'indexProviders'])->middleware('permission:role_settings,pos');
        Route::middleware('permission:role_settings')->group(function () {
            Route::post('settings/payment-providers', [PaymentMethodSettingController::class, 'storeProvider']);
            Route::put('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'updateProvider']);
            Route::delete('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'deleteProvider']);
        });

        // Inventory Restock, Movements & Opname
        Route::post('inventory/restock', [InventoryController::class, 'restock'])->middleware('permission:goods_receipt');
        Route::get('purchases', [PurchaseController::class, 'index'])->middleware('permission:goods_receipt,accounts_payable,purchase_return');
        Route::middleware('permission:purchase_return')->group(function () {
            Route::post('purchases/{id}/returns', [PurchaseController::class, 'returnGoods']);
            Route::post('purchases/{id}/cancel', [PurchaseController::class, 'cancel']);
        });
        Route::post('purchases/{id}/payments', [PurchaseController::class, 'pay'])->middleware('permission:accounts_payable');
        Route::get('inventory/stock-movements', [InventoryController::class, 'stockMovements'])->middleware('permission:inventory_view');
        Route::get('inventory/valuation', [InventoryController::class, 'valuation'])->middleware('permission:inventory_view');
        Route::post('inventory/opening-balance', [InventoryController::class, 'openingBalance'])->middleware('permission:accounting_hub');
        Route::post('inventory/stock-opname', [InventoryController::class, 'stockOpname'])->middleware('permission:stock_opname');

        // Stock Excel Import & Reconciliation (Paritas ProjectOmahBan)
        Route::prefix('stock')->middleware('permission:stock_opname')->group(function () {
            Route::post('import-preview', [StockReconciliationApiController::class, 'importPreview']);
            Route::get('staging', [StockReconciliationApiController::class, 'getStaging']);
            Route::post('resolve-brand', [StockReconciliationApiController::class, 'resolveBrand']);
            Route::post('resolve-name', [StockReconciliationApiController::class, 'resolveName']);
            Route::post('ignore-unresolved', [StockReconciliationApiController::class, 'ignoreUnresolved']);
            Route::post('commit', [StockReconciliationApiController::class, 'commit']);
            Route::post('bulk-update', [StockReconciliationApiController::class, 'bulkUpdate']);
            Route::post('reconciliation/bulk-update', [StockReconciliationApiController::class, 'bulkUpdate']);
            Route::get('template', [StockReconciliationApiController::class, 'downloadTemplate']);
        });

        // Laporan Stok Bulanan & Buku FIFO Spreadsheet (Paritas ProjectOmahBan)
        Route::prefix('reports/stock-monthly')->group(function () {
            Route::get('/', [ReportStockMonthlyApiController::class, 'index'])->middleware('permission:inventory_view');
            Route::get('/export', [ReportStockMonthlyApiController::class, 'exportExcel'])->middleware('permission:inventory_view');
            Route::post('/inline-update', [ReportStockMonthlyApiController::class, 'inlineUpdate'])->middleware('permission:stock_opname');
        });

        // Expense Management (BKK) & Void Reversal
        Route::middleware('permission:expenses')->group(function () {
            Route::get('expense-categories', [ExpenseController::class, 'categories']);
            Route::get('expenses', [ExpenseController::class, 'index']);
            Route::post('expenses', [ExpenseController::class, 'store']);
            Route::get('expenses/{id}', [ExpenseController::class, 'show']);
            Route::post('expenses/{id}/void', [ExpenseController::class, 'void']);
        });

        // SAK EMKM (SP4): aset tetap & penyusutan, jurnal penyesuaian, rekonsiliasi bank, CALK
        Route::prefix('accounting/fixed-assets')->middleware('permission:fixed_assets')->group(function () {
            Route::get('/', [FixedAssetController::class, 'index']);
            Route::post('/', [FixedAssetController::class, 'store']);
            Route::post('{id}/void', [FixedAssetController::class, 'void'])->whereNumber('id');
            Route::get('depreciation', [FixedAssetController::class, 'depreciationPreview']);
            Route::post('depreciation', [FixedAssetController::class, 'runDepreciation']);
        });
        Route::post('accounting/adjusting-entries', [AdjustingEntryController::class, 'store'])->middleware('permission:accounting_hub');

        // SAK EMKM Accounting Hub & Reports
        Route::prefix('accounting')->group(function () {
            Route::middleware('permission:accounting_hub')->group(function () {
                Route::get('journals', [AccountingReportController::class, 'journals']);
                Route::post('journals/manual', [AccountingReportController::class, 'createManualJournal']);
                Route::post('journals/{entryNumber}/reverse', [AccountingReportController::class, 'reverseJournal']);
                Route::get('general-ledger', [AccountingReportController::class, 'generalLedger']);
                Route::get('trial-balance', [AccountingReportController::class, 'trialBalance']);
                Route::get('periods', [AccountingPeriodController::class, 'index']);
                Route::post('periods/close', [AccountingPeriodController::class, 'close']);
                Route::post('periods/{period}/reopen', [AccountingPeriodController::class, 'reopen'])->where('period', '\d{4}-\d{2}');
                Route::get('opening-balance', [OpeningBalanceController::class, 'show']);
                Route::post('opening-balance', [OpeningBalanceController::class, 'store']);
            });
            Route::get('financial-statements', [AccountingReportController::class, 'financialStatements'])->middleware('permission:financial_reports,accounting_hub');
            Route::get('cash-flow', [AccountingReportController::class, 'cashFlow'])->middleware('permission:financial_reports,accounting_hub');
            Route::get('cash-balances', [AccountingReportController::class, 'cashBalances'])->middleware('permission:expenses,accounting_hub,financial_reports,cash_session');
            Route::middleware('permission:accounts_payable')->group(function () {
                Route::get('accounts-payable', [AccountingReportController::class, 'accountsPayable']);
                Route::post('accounts-payable/pay', [AccountingReportController::class, 'payDebt']);
            });
        });
    });
});
