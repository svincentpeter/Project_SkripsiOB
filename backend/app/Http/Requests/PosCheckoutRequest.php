<?php

namespace App\Http\Requests;

use App\Services\Pos\PosAccounts;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Checkout POS: klien hanya mengirim baris keranjang & pembayaran; seluruh total dihitung server.
 * Setiap nota lunas saat checkout (Tunai, Transfer, QRIS, atau kombinasinya).
 */
class PosCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name' => 'nullable|string|max:100',
            'customer_phone' => 'nullable|string|max:30',
            'vehicle_plate' => 'nullable|string|max:30',
            'vehicle_model' => 'nullable|string|max:60',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.type' => ['required', Rule::in(['PRODUCT', 'SERVICE'])],
            'items.*.product_id' => 'nullable|integer',
            'items.*.service_id' => 'nullable|integer',
            'items.*.name' => 'required|string|max:200',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_per_item' => 'nullable|numeric|min:0',
            'items.*.is_manual' => 'nullable|boolean',
            'items.*.cost_price' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            // Klien lama yang masih mengirim BON / booking DP ditolak, bukan diabaikan diam-diam.
            'booking_id' => 'prohibited',
            'bon' => 'prohibited',
            'payments' => 'nullable|array',
            'payments.*.method' => ['required', Rule::in(PosAccounts::CHECKOUT_METHODS)],
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.tendered' => 'nullable|numeric|min:0',
            'payments.*.fee_percentage' => 'nullable|numeric|min:0|max:10',
            'payments.*.provider_name' => 'nullable|string|max:100',
            'payments.*.reference' => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'booking_id.prohibited' => 'Booking DP sudah tidak didukung. Selesaikan nota dengan pembayaran penuh.',
            'bon.prohibited' => 'Penjualan BON (piutang) sudah tidak didukung. Setiap nota harus lunas saat checkout.',
            'payments.*.method.in' => 'Metode pembayaran tidak dikenal. Gunakan Tunai, Transfer, atau QRIS.',
        ];
    }
}
