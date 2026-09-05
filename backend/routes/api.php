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
});

