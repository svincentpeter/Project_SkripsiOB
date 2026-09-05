<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\ServiceMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceMasterController extends Controller
{
    public function index(): JsonResponse
    {
        $services = ServiceMaster::orderBy('service_name')->get();

        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'service_code' => 'required|string|max:50|unique:service_masters',
            'service_name' => 'required|string|max:150',
            'category' => 'required|string|max:50',
            'standard_price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $service = ServiceMaster::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Layanan jasa berhasil ditambahkan',
            'data' => $service,
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $service = ServiceMaster::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $service,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $service = ServiceMaster::findOrFail($id);

        $validated = $request->validate([
            'service_code' => 'required|string|max:50|unique:service_masters,service_code,' . $id,
            'service_name' => 'required|string|max:150',
            'category' => 'required|string|max:50',
            'standard_price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Layanan jasa berhasil diperbarui',
            'data' => $service,
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $service = ServiceMaster::findOrFail($id);
        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Layanan jasa berhasil dihapus',
        ]);
    }
}
