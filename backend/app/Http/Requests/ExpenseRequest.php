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
            'expense_date' => 'required|date',
            'category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|string|in:KAS_LACI,BANK_BCA,TUNAI,TRANSFER_BCA',
            'bank_name' => 'nullable|string|max:50',
            'recipient_name' => 'required|string|max:120',
            'description' => 'required|string',
            'attachment_path' => 'nullable|string',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
            'approved_by' => 'nullable|string|max:80',
        ];
    }
}
