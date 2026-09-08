<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'cashier_name' => 'nullable|string|max:80',
            'payment_method' => 'required|string|in:TUNAI,TRANSFER,TRANSFER_BCA,QRIS,KARTU_DEBIT,KREDIT,EDC,EDC_DEBIT,EDC_CREDIT,BON',
            'paid_amount' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'payment_provider' => 'nullable|string|max:100',
            'edc_bank' => 'nullable|string|max:100',
            'edc_type' => 'nullable|string|in:Debit,Credit',
            'fee_percentage' => 'nullable|numeric|min:0',
            'fee_amount' => 'nullable|numeric|min:0',
            'surcharge_amount' => 'nullable|numeric|min:0',
            'net_received' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer',
            'items.*.type' => 'nullable|string',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.sub_total' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
        ];
    }
}
