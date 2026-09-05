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
    Route::post('pos/checkout', [\App\Http\Controllers\Api\v1\PosController::class, 'checkout']);
    Route::get('pos/transactions', [\App\Http\Controllers\Api\v1\PosController::class, 'index']);
    Route::get('pos/transactions/{id}', [\App\Http\Controllers\Api\v1\PosController::class, 'show']);

    // Inventory Restock, Movements & Opname
    Route::post('inventory/restock', [\App\Http\Controllers\Api\v1\InventoryController::class, 'restock']);
    Route::get('inventory/stock-movements', [\App\Http\Controllers\Api\v1\InventoryController::class, 'stockMovements']);
    Route::post('inventory/stock-opname', [\App\Http\Controllers\Api\v1\InventoryController::class, 'stockOpname']);
});

