<?php

namespace App\Http\Requests;

use App\Services\Pos\PosAccounts;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Checkout POS: klien hanya mengirim baris keranjang & pembayaran; seluruh total dihitung server.
 */
class PosCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return array_merge(self::cartRules(), [
            'tax_rate' => ['nullable', Rule::in([0, 11])],
            'discount_amount' => 'nullable|numeric|min:0',
            'booking_id' => 'nullable|integer',
            'bon' => 'nullable|array',
            'bon.term_days' => ['required_with:bon', Rule::in([7, 14, 30])],
            'payments' => 'nullable|array',
            'payments.*.method' => ['required', Rule::in(PosAccounts::CHECKOUT_METHODS)],
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.tendered' => 'nullable|numeric|min:0',
            'payments.*.fee_percentage' => 'nullable|numeric|min:0|max:10',
            'payments.*.charge_to_customer' => 'nullable|boolean',
            'payments.*.provider_name' => 'nullable|string|max:100',
            'payments.*.edc_bank' => 'nullable|string|max:100',
            'payments.*.edc_type' => 'nullable|in:Debit,Credit',
            'payments.*.reference' => 'nullable|string|max:100',
        ]);
    }

    /**
     * Aturan pelanggan & baris keranjang, dipakai juga oleh booking DP.
     */
    public static function cartRules(): array
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
        ];
    }
}
