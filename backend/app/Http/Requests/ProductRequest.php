<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Master data produk. Stok hanya berubah lewat batch (stok awal, penerimaan barang, opname),
 * sehingga product_quantity tidak diterima dari klien.
 */
class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productId = $this->route('product');

        return [
            'product_name' => 'required|string|max:150',
            'product_code' => 'nullable|string|max:50|unique:products,product_code,'.$productId,
            'barcode' => 'nullable|string|max:50|unique:products,barcode,'.$productId,
            'brand' => 'required|string|max:50',
            'category_id' => 'nullable|integer|exists:product_categories,id',
            'size_width' => 'nullable|integer',
            'size_ratio' => 'nullable|integer',
            'ring' => 'nullable|string|max:10',
            'product_size' => 'nullable|string|max:30',
            'motif' => 'nullable|string|max:80',
            'condition_code' => 'nullable|string|max:20',
            'product_year' => 'nullable|string|max:10',
            'product_cost' => 'required|numeric|min:0',
            'product_price' => 'required|numeric|min:0',
            'product_stock_alert' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'initial_batch' => 'nullable|array',
            'initial_batch.source_name' => 'required_with:initial_batch|string|max:150',
            'initial_batch.batch_cost' => 'required_with:initial_batch|numeric|min:0',
            'initial_batch.initial_qty' => 'required_with:initial_batch|integer|min:1',
        ];
    }
}
