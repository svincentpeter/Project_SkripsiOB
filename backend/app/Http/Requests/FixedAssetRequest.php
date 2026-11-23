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
            'depreciation_start' => 'nullable|required_if:funding,OPENING,MODAL|prohibited_unless:funding,OPENING,MODAL|date_format:Y-m',
            'opening_accumulated_depreciation' => 'nullable|prohibited_unless:funding,OPENING,MODAL|numeric|min:0|max:10000000000',
            'notes' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'acquisition_date.before_or_equal' => 'Tanggal perolehan tidak boleh melebihi hari ini.',
            'depreciation_start.required_if' => 'Aset dari saldo awal atau setoran modal wajib diisi bulan mulai disusutkan sistem.',
            'depreciation_start.prohibited_unless' => 'Bulan mulai penyusutan hanya diisi untuk aset dari saldo awal atau setoran modal; aset yang dibeli mulai disusutkan pada bulan perolehan.',
            'opening_accumulated_depreciation.prohibited_unless' => 'Akumulasi penyusutan awal hanya untuk aset dari saldo awal atau setoran modal.',
            'category.in' => 'Kategori aset tidak dikenal.',
            'funding.in' => 'Sumber dana harus Tunai, Transfer, Saldo awal, atau Setoran modal.',
            'acquisition_date.date_format' => 'Tanggal perolehan harus berformat YYYY-MM-DD.',
            'depreciation_start.date_format' => 'Bulan mulai penyusutan harus berformat YYYY-MM.',
            'name.max' => 'Nama aset maksimal :max karakter.',
            'notes.max' => 'Catatan maksimal :max karakter.',
            'useful_life_months.min' => 'Umur manfaat minimal :min bulan.',
            'useful_life_months.max' => 'Umur manfaat maksimal :max bulan.',
            // Sisa aturan: pesan umum dengan nama field berbahasa Indonesia (locale aplikasi en).
            'required' => ':Attribute wajib diisi.',
            'string' => ':Attribute harus berupa teks.',
            'numeric' => ':Attribute harus berupa angka.',
            'integer' => ':Attribute harus berupa bilangan bulat.',
            'min' => ':Attribute minimal :min.',
            'max' => ':Attribute maksimal :max.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nama aset',
            'category' => 'kategori',
            'acquisition_date' => 'tanggal perolehan',
            'acquisition_cost' => 'harga perolehan',
            'residual_value' => 'nilai residu',
            'useful_life_months' => 'umur manfaat (bulan)',
            'funding' => 'sumber dana',
            'depreciation_start' => 'bulan mulai penyusutan',
            'opening_accumulated_depreciation' => 'akumulasi penyusutan awal',
            'notes' => 'catatan',
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
