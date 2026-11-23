<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\PaymentProviderSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodSettingController extends Controller
{
    /**
     * Opsi pembayaran aktif untuk kasir: rekening transfer dan provider QRIS.
     */
    public function getPaymentOptions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'bank_providers' => PaymentProviderSetting::active()->bank()->get(),
                'qris_providers' => PaymentProviderSetting::active()->qris()->get(),
            ],
        ]);
    }

    /**
     * List all payment providers (transfer & qris) for settings page.
     */
    public function indexProviders(Request $request): JsonResponse
    {
        $query = PaymentProviderSetting::query()->orderBy('method_type')->orderBy('sort_order');

        if ($request->filled('method_type')) {
            $query->where('method_type', $request->method_type);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    /**
     * Store new payment provider.
     */
    public function storeProvider(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'method_type' => 'required|in:bank,qris',
            'provider_name' => 'required|string|max:100',
            'provider_code' => 'nullable|string|max:50',
            // Kolom NOT NULL; MDR di atas 10% hampir pasti salah ketik (mis. 30 untuk 0,3).
            'fee_percentage' => 'sometimes|numeric|min:0|max:10',
            'fee_threshold_amount' => 'sometimes|numeric|min:0|max:10000000000',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $provider = PaymentProviderSetting::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Provider pembayaran berhasil ditambahkan.',
            'data' => $provider,
        ], 201);
    }

    /**
     * Update existing payment provider.
     */
    public function updateProvider(Request $request, $id): JsonResponse
    {
        $provider = PaymentProviderSetting::findOrFail($id);

        $validated = $request->validate([
            'provider_name' => 'sometimes|required|string|max:100',
            'provider_code' => 'nullable|string|max:50',
            // Kolom NOT NULL; MDR di atas 10% hampir pasti salah ketik (mis. 30 untuk 0,3).
            'fee_percentage' => 'sometimes|numeric|min:0|max:10',
            'fee_threshold_amount' => 'sometimes|numeric|min:0|max:10000000000',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $provider->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Provider pembayaran berhasil diperbarui.',
            'data' => $provider,
        ]);
    }

    /**
     * Delete payment provider.
     */
    public function deleteProvider($id): JsonResponse
    {
        $provider = PaymentProviderSetting::findOrFail($id);
        $provider->delete();

        return response()->json([
            'success' => true,
            'message' => 'Provider pembayaran berhasil dihapus.',
        ]);
    }
}
