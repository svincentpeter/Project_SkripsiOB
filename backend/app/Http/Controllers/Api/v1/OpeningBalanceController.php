<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Accounting\OpeningBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpeningBalanceController extends Controller
{
    public function __construct(private readonly OpeningBalanceService $openings)
    {
    }

    public function show(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->openings->current()?->toApiArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        $rules = [
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'balances' => 'required|min:1|array:'.implode(',', OpeningBalanceService::ACCOUNTS),
        ];
        foreach (OpeningBalanceService::ACCOUNTS as $code) {
            $rules["balances.{$code}"] = $code === '3-2000' ? 'nullable|numeric' : 'nullable|numeric|min:0';
        }
        $data = $request->validate($rules, ['balances.array' => 'Saldo awal hanya untuk kas, bank, aset tetap, akumulasi penyusutan, dan laba ditahan.']);

        $journal = $this->openings->post($data['date'], $data['balances']);

        return response()->json([
            'success' => true,
            'message' => "Saldo awal akun dibukukan ({$journal->entry_number}).",
            'data' => $journal->toApiArray(),
        ], 201);
    }
}
