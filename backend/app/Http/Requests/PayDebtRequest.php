<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PayDebtRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'required|exists:suppliers,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|string|in:KAS_LACI,BANK_BCA,TUNAI,TRANSFER_BCA',
            'payment_date' => 'nullable|date|before_or_equal:today',
            'notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return ['payment_date.before_or_equal' => 'Tanggal pembayaran tidak boleh melebihi hari ini.'];
    }
}
