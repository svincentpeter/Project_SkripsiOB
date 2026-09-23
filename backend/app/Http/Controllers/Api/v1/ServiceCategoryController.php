<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use App\Models\ServiceMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $counts = ServiceMaster::groupBy('category')->selectRaw('category, count(*) as c')->pluck('c', 'category');

        return response()->json([
            'success' => true,
            'data' => ServiceCategory::orderBy('name')->get()->map(fn (ServiceCategory $c) => $c->toArray() + [
                'service_count' => (int) ($counts[$c->code] ?? 0),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $category = ServiceCategory::create($this->validated($request));

        return response()->json(['success' => true, 'message' => 'Kategori jasa ditambahkan.', 'data' => $category], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = ServiceCategory::findOrFail($id);
        $category->update($this->validated($request, $id));

        return response()->json(['success' => true, 'message' => 'Kategori jasa diperbarui.', 'data' => $category]);
    }

    public function destroy(int $id): JsonResponse
    {
        $category = ServiceCategory::findOrFail($id);
        $used = ServiceMaster::where('category', $category->code)->count();
        if ($used > 0) {
            return response()->json([
                'message' => "Kategori {$category->name} masih dipakai {$used} layanan jasa.",
            ], 422);
        }
        $category->delete();

        return response()->json(['success' => true, 'message' => 'Kategori jasa dihapus.']);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('service_categories', 'code')->ignore($id)],
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);
    }
}
