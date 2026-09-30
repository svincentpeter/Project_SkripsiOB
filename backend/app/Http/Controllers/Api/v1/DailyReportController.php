<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Reports\DailyReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Laporan operasional harian (baca saja): rekap harian & dashboard, laporan kas harian per kasir.
 */
class DailyReportController extends Controller
{
    public function recap(Request $request, DailyReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'from' => 'required|date_format:Y-m-d',
            'to' => 'required|date_format:Y-m-d|after_or_equal:from',
        ]);

        return response()->json(['success' => true, 'data' => $reports->recap($data['from'], $data['to'])]);
    }

    public function cash(Request $request, DailyReportService $reports): JsonResponse
    {
        $data = $request->validate(['date' => 'nullable|date_format:Y-m-d']);
        $user = $request->user();

        // Tanpa izin laporan keuangan (mis. kasir) hanya nota, sesi dan rekap milik sendiri yang terlihat.
        $only = $user->hasPermission('financial_reports') ? null : $user;

        return response()->json([
            'success' => true,
            'data' => $reports->dailyCash($data['date'] ?? now()->toDateString(), $only),
        ]);
    }
}
