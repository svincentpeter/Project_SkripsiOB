<?php

namespace App\Http\Controllers\Api\v1;

use App\Exceptions\PosRuleException;
use App\Http\Controllers\Controller;
use App\Services\Accounting\CalkReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalkController extends Controller
{
    public function show(Request $request, CalkReport $calk): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);
        if ($data['period'] > now()->format('Y-m')) {
            throw new PosRuleException('CALK hanya dapat disusun untuk bulan berjalan atau bulan sebelumnya.');
        }

        return response()->json(['success' => true, 'data' => $calk->build($data['period'])]);
    }
}
