<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\FixedAssetRequest;
use App\Models\FixedAsset;
use App\Services\Accounting\FixedAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FixedAssetController extends Controller
{
    public function __construct(private readonly FixedAssetService $assets)
    {
    }

    public function index(): JsonResponse
    {
        $assets = FixedAsset::withSum('depreciations', 'amount')
            ->withMax('depreciations', 'period')
            ->orderBy('acquisition_date')->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'assets' => $assets->map(fn (FixedAsset $a) => $a->toApiArray())->values(),
                'summary' => FixedAssetService::summary($assets),
            ],
        ]);
    }

    public function store(FixedAssetRequest $request): JsonResponse
    {
        $result = $this->assets->create($request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Aset tetap {$result['asset']->code} dicatat.",
            'data' => [
                'asset' => $result['asset']->toApiArray(),
                'journals' => $result['journal'] ? [$result['journal']->toApiArray()] : [],
            ],
        ], 201);
    }

    public function void(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255']);
        $result = $this->assets->void($id, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Aset tetap {$result['asset']->code} dibatalkan.",
            'data' => [
                'asset' => $result['asset']->toApiArray(),
                'journals' => $result['journal'] ? [$result['journal']->toApiArray()] : [],
            ],
        ]);
    }
}
