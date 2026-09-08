<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        try {
            \Illuminate\Support\Facades\DB::connection()->getPdo();
            $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
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

    // Master Data Endpoints
    Route::apiResource('products', \App\Http\Controllers\Api\v1\ProductController::class);
    Route::apiResource('services', \App\Http\Controllers\Api\v1\ServiceMasterController::class);
    Route::apiResource('suppliers', \App\Http\Controllers\Api\v1\SupplierController::class);
    Route::get('accounts', [\App\Http\Controllers\Api\v1\AccountController::class, 'index']);

    // POS Kiosk & Transactions
    Route::get('pos/payment-options', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'getPaymentOptions']);
    Route::post('pos/checkout', [\App\Http\Controllers\Api\v1\PosController::class, 'checkout']);
    Route::get('pos/transactions', [\App\Http\Controllers\Api\v1\PosController::class, 'index']);
    Route::get('pos/transactions/{id}', [\App\Http\Controllers\Api\v1\PosController::class, 'show']);

    // Payment Method Settings (Parity ProjectOmahBan)
    Route::get('settings/payment-providers', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'indexProviders']);
    Route::post('settings/payment-providers', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'storeProvider']);
    Route::put('settings/payment-providers/{id}', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'updateProvider']);
    Route::delete('settings/payment-providers/{id}', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'deleteProvider']);

    Route::get('settings/edc', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'indexEdc']);
    Route::post('settings/edc', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'storeEdc']);
    Route::put('settings/edc/{id}', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'updateEdc']);
    Route::delete('settings/edc/{id}', [\App\Http\Controllers\Api\v1\PaymentMethodSettingController::class, 'deleteEdc']);

    // Inventory Restock, Movements & Opname
    Route::post('inventory/restock', [\App\Http\Controllers\Api\v1\InventoryController::class, 'restock']);
    Route::get('inventory/stock-movements', [\App\Http\Controllers\Api\v1\InventoryController::class, 'stockMovements']);
    Route::post('inventory/stock-opname', [\App\Http\Controllers\Api\v1\InventoryController::class, 'stockOpname']);

    // Stock Excel Import & Reconciliation (Paritas ProjectOmahBan)
    Route::prefix('stock')->group(function () {
        Route::post('import-preview', [\App\Http\Controllers\Api\v1\StockReconciliationApiController::class, 'importPreview']);
        Route::get('staging', [\App\Http\Controllers\Api\v1\StockReconciliationApiController::class, 'getStaging']);
        Route::post('resolve-brand', [\App\Http\Controllers\Api\v1\StockReconciliationApiController::class, 'resolveBrand']);
        Route::post('resolve-name', [\App\Http\Controllers\Api\v1\StockReconciliationApiController::class, 'resolveName']);
        Route::post('ignore-unresolved', [\App\Http\Controllers\Api\v1\StockReconciliationApiController::class, 'ignoreUnresolved']);
        Route::post('commit', [\App\Http\Controllers\Api\v1\StockReconciliationApiController::class, 'commit']);
        Route::get('template', [\App\Http\Controllers\Api\v1\StockReconciliationApiController::class, 'downloadTemplate']);
    });

    // Expense Management (BKK) & Void Reversal
    Route::get('expense-categories', [\App\Http\Controllers\Api\v1\ExpenseController::class, 'categories']);
    Route::get('expenses', [\App\Http\Controllers\Api\v1\ExpenseController::class, 'index']);
    Route::post('expenses', [\App\Http\Controllers\Api\v1\ExpenseController::class, 'store']);
    Route::get('expenses/{id}', [\App\Http\Controllers\Api\v1\ExpenseController::class, 'show']);
    Route::post('expenses/{id}/void', [\App\Http\Controllers\Api\v1\ExpenseController::class, 'void']);

    // SAK EMKM Accounting Hub & Reports
    Route::prefix('accounting')->group(function () {
        Route::get('journals', [\App\Http\Controllers\Api\v1\AccountingReportController::class, 'journals']);
        Route::post('journals/manual', [\App\Http\Controllers\Api\v1\AccountingReportController::class, 'createManualJournal']);
        Route::get('general-ledger', [\App\Http\Controllers\Api\v1\AccountingReportController::class, 'generalLedger']);
        Route::get('trial-balance', [\App\Http\Controllers\Api\v1\AccountingReportController::class, 'trialBalance']);
        Route::get('financial-statements', [\App\Http\Controllers\Api\v1\AccountingReportController::class, 'financialStatements']);
        Route::get('accounts-payable', [\App\Http\Controllers\Api\v1\AccountingReportController::class, 'accountsPayable']);
        Route::post('accounts-payable/pay', [\App\Http\Controllers\Api\v1\AccountingReportController::class, 'payDebt']);
    });
});

