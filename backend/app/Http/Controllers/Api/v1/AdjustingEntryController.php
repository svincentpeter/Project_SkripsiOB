<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\Accounting\AdjustingEntryService;
use App\Services\Accounting\DepreciationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdjustingEntryController extends Controller
{
    public function store(Request $request, AdjustingEntryService $adjusting): JsonResponse
    {
        $accountMessage = 'Pilih akun beban operasional aktif (6-xxxx) selain Beban Penyusutan; penyusutan dibukukan dari register aset tetap.';
        $data = $request->validate([
            'period' => 'required|date_format:Y-m',
            'kind' => 'required|in:ACCRUAL,PREPAID',
            'account_code' => [
                'required', 'string', 'starts_with:6-',
                Rule::exists('accounts', 'account_code')->where('account_type', 'EXPENSE')->where('is_active', true),
                Rule::notIn([DepreciationService::EXPENSE_ACCOUNT]),
            ],
            'amount' => 'required|numeric|min:1|max:10000000000',
            'description' => 'required|string|max:200',
            'auto_reverse' => [
                'sometimes', 'boolean',
                Rule::prohibitedIf(fn () => $request->input('kind') === 'PREPAID' && $request->boolean('auto_reverse')),
            ],
        ], [
            'account_code.starts_with' => $accountMessage,
            'account_code.exists' => $accountMessage,
            'account_code.not_in' => $accountMessage,
            'auto_reverse.prohibited' => 'Pembalik otomatis hanya untuk akrual beban.',
        ]);

        $journals = $adjusting->create($data);
        $message = count($journals) === 2
            ? "AJP {$journals[0]->reference_id} dibukukan beserta jurnal pembalik tanggal {$journals[1]->entry_date->toDateString()}."
            : "AJP {$journals[0]->reference_id} dibukukan.";

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => ['journals' => array_map(fn (JournalEntry $j) => $j->toApiArray(), $journals)],
        ], 201);
    }
}
