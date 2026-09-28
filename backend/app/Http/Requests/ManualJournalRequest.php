<?php

namespace App\Http\Requests;

use App\Services\Accounting\ManualJournalService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ManualJournalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'description' => 'required|string|max:255',
            'items' => 'required|array|min:2|max:30',
            'items.*.account_code' => [
                'required', 'string',
                Rule::exists('accounts', 'account_code')->where('is_active', true),
                Rule::notIn(ManualJournalService::CONTROL_ACCOUNTS),
            ],
            'items.*.debit' => 'required|numeric|min:0|max:1000000000',
            'items.*.credit' => 'required|numeric|min:0|max:1000000000',
            'items.*.note' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'date.before_or_equal' => 'Tanggal jurnal tidak boleh melebihi hari ini.',
            'items.*.account_code.not_in' => 'Akun kontrol (piutang, persediaan, hutang, uang muka DP) hanya berubah lewat transaksi sumbernya, bukan jurnal manual.',
            'items.*.account_code.exists' => 'Kode akun tidak ada di bagan akun atau tidak aktif.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            foreach ((array) $this->input('items', []) as $i => $item) {
                $hasDebit = (float) ($item['debit'] ?? 0) > 0;
                $hasCredit = (float) ($item['credit'] ?? 0) > 0;
                if ($hasDebit === $hasCredit) {
                    $validator->errors()->add("items.{$i}", 'Setiap baris harus berisi debit atau kredit (salah satu saja).');
                }
            }
        }];
    }
}
