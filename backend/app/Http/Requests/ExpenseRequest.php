<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'expense_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'category_id' => 'required|integer|exists:expense_categories,id',
            'amount' => 'required|numeric|min:1|max:1000000000',
            'payment_method' => 'required|string|in:TUNAI,TRANSFER_BCA,KAS_LACI,BANK_BCA',
            'bank_name' => 'nullable|string|max:50',
            'recipient_name' => 'required|string|max:120',
            'description' => 'required|string|max:1000',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'expense_date.before_or_equal' => 'Tanggal pengeluaran tidak boleh melebihi hari ini.',
            'category_id.exists' => 'Kategori beban tidak dikenal.',
        ];
    }
}
