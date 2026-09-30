<?php

namespace App\Http\Requests;

use App\Models\FixedAsset;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class FixedAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150',
            'category' => ['required', Rule::in(array_keys(FixedAsset::CATEGORIES))],
            'acquisition_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'acquisition_cost' => 'required|numeric|min:1|max:10000000000',
            'residual_value' => 'nullable|numeric|min:0|max:10000000000',
            'useful_life_months' => 'required|integer|min:1|max:600',
            'funding' => ['required', Rule::in(FixedAsset::FUNDING)],
            'depreciation_start' => 'nullable|required_if:funding,OPENING|prohibited_unless:funding,OPENING|date_format:Y-m',
            'opening_accumulated_depreciation' => 'nullable|prohibited_unless:funding,OPENING|numeric|min:0|max:10000000000',
            'notes' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'acquisition_date.before_or_equal' => 'Tanggal perolehan tidak boleh melebihi hari ini.',
            'depreciation_start.required_if' => 'Aset dari saldo awal wajib diisi bulan mulai disusutkan sistem.',
            'depreciation_start.prohibited_unless' => 'Bulan mulai penyusutan hanya diisi untuk aset dari saldo awal; aset yang dibeli mulai disusutkan pada bulan perolehan.',
            'opening_accumulated_depreciation.prohibited_unless' => 'Akumulasi penyusutan awal hanya untuk aset dari saldo awal.',
            'category.in' => 'Kategori aset tidak dikenal.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $cost = (float) $this->input('acquisition_cost', 0);
            $residual = (float) $this->input('residual_value', 0);
            $opening = (float) $this->input('opening_accumulated_depreciation', 0);
            if ($residual + $opening > $cost) {
                $validator->errors()->add('residual_value', 'Nilai residu ditambah akumulasi penyusutan awal tidak boleh melebihi harga perolehan.');
            }

            $start = $this->input('depreciation_start');
            $acquired = (string) $this->input('acquisition_date', '');
            if (is_string($start) && preg_match('/^\d{4}-\d{2}$/', $start) && strlen($acquired) >= 7 && $start < substr($acquired, 0, 7)) {
                $validator->errors()->add('depreciation_start', 'Bulan mulai penyusutan tidak boleh sebelum bulan perolehan.');
            }
        }];
    }
}
