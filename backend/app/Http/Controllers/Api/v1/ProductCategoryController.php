<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ProductCategory::withCount('products')->orderBy('category_name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $category = ProductCategory::create($this->validated($request));

        return response()->json(['success' => true, 'message' => 'Kategori produk ditambahkan.', 'data' => $category], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = ProductCategory::findOrFail($id);
        $category->update($this->validated($request, $id));

        return response()->json(['success' => true, 'message' => 'Kategori produk diperbarui.', 'data' => $category]);
    }

    public function destroy(int $id): JsonResponse
    {
        $category = ProductCategory::withCount('products')->findOrFail($id);
        if ($category->products_count > 0) {
            return response()->json([
                'message' => "Kategori {$category->category_name} masih dipakai {$category->products_count} produk. Nonaktifkan saja atau pindahkan produknya dulu.",
            ], 422);
        }
        $category->delete();

        return response()->json(['success' => true, 'message' => 'Kategori produk dihapus.']);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'category_code' => ['required', 'string', 'max:50', Rule::unique('product_categories', 'category_code')->ignore($id)],
            'category_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);
    }
}
