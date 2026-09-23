<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(): JsonResponse
    {
        $suppliers = Supplier::orderBy('supplier_name')->get();

        return response()->json([
            'success' => true,
            'data' => $suppliers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers',
            'supplier_name' => 'required|string|max:150',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:100',
            'payment_terms_days' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil ditambahkan',
            'data' => $supplier,
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $supplier,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code,' . $id,
            'supplier_name' => 'required|string|max:150',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:100',
            'payment_terms_days' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil diperbarui',
            'data' => $supplier,
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);

        // Supplier dengan riwayat pembelian hanya dinonaktifkan agar hutang & histori tetap utuh.
        if (\App\Models\Purchase::where('supplier_id', $supplier->id)->exists()) {
            $supplier->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Supplier memiliki riwayat pembelian sehingga dinonaktifkan, bukan dihapus.',
                'data' => ['deleted' => false, 'deactivated' => true],
            ]);
        }

        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil dihapus',
            'data' => ['deleted' => true, 'deactivated' => false],
        ]);
    }
}
