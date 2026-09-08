<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\EdcSetting;
use App\Models\PaymentProviderSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodSettingController extends Controller
{
    /**
     * Get active payment options for POS cashier checkout.
     */
    public function getPaymentOptions(): JsonResponse
    {
        $banks = PaymentProviderSetting::active()
            ->bank()
            ->get();

        $qris = PaymentProviderSetting::active()
            ->qris()
            ->get();

        $edc = EdcSetting::active()
            ->orderBy('bank_name')
            ->orderBy('payment_type')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'bank_providers' => $banks,
                'qris_providers' => $qris,
                'edc_settings' => $edc,
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
            'fee_percentage' => 'nullable|numeric|min:0|max:100',
            'fee_threshold_amount' => 'nullable|numeric|min:0',
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
            'fee_percentage' => 'nullable|numeric|min:0|max:100',
            'fee_threshold_amount' => 'nullable|numeric|min:0',
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

    /**
     * List all EDC settings.
     */
    public function indexEdc(): JsonResponse
    {
        $edc = EdcSetting::orderBy('bank_name')->orderBy('payment_type')->get();

        return response()->json([
            'success' => true,
            'data' => $edc,
        ]);
    }

    /**
     * Store new EDC setting.
     */
    public function storeEdc(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bank_name' => 'required|string|max:100',
            'payment_type' => 'required|in:Debit,Credit',
            'fee_percentage' => 'required|numeric|min:0|max:100',
            'charge_to_customer' => 'boolean',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        // Auto default charge_to_customer for Credit if not specified
        if (!isset($validated['charge_to_customer'])) {
            $validated['charge_to_customer'] = ($validated['payment_type'] === 'Credit');
        }

        $edc = EdcSetting::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan EDC berhasil ditambahkan.',
            'data' => $edc,
        ], 201);
    }

    /**
     * Update existing EDC setting.
     */
    public function updateEdc(Request $request, $id): JsonResponse
    {
        $edc = EdcSetting::findOrFail($id);

        $validated = $request->validate([
            'fee_percentage' => 'sometimes|required|numeric|min:0|max:100',
            'charge_to_customer' => 'boolean',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $edc->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan EDC berhasil diperbarui.',
            'data' => $edc,
        ]);
    }

    /**
     * Delete EDC setting.
     */
    public function deleteEdc($id): JsonResponse
    {
        $edc = EdcSetting::findOrFail($id);
        $edc->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan EDC berhasil dihapus.',
        ]);
    }
}
