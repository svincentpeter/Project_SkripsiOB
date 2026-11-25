<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Accounting\OpeningBalanceService;
use App\Services\Accounting\OpeningSubledgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpeningBalanceController extends Controller
{
    public function __construct(
        private readonly OpeningBalanceService $openings,
        private readonly OpeningSubledgerService $subledgers,
    ) {
    }

    /** Kompatibilitas lama: mengembalikan jurnal ACCOUNT_OPENING pertama (atau null). */
    public function show(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->openings->current()?->toApiArray()]);
    }

    /** Ringkasan saldo awal lengkap sinkron COA + buku pembantu (persediaan, piutang, utang) + riwayat. */
    public function summary(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->openings->summary()]);
    }

    /** Membukukan saldo awal akun neraca dari COA (mendukung seluruh akun neraca aktif non-subledger). */
    public function store(Request $request): JsonResponse
    {
        $eligibleCodes = OpeningBalanceService::eligibleAccounts()->pluck('account_code')->all();
        $rules = [
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'allow_additional' => 'nullable|boolean',
            'notes' => 'nullable|string|max:200',
            'balances' => 'required|min:1|array:'.implode(',', $eligibleCodes),
        ];
        foreach ($eligibleCodes as $code) {
            $rules["balances.{$code}"] = $code === '3-2000' ? 'nullable|numeric' : 'nullable|numeric|min:0';
        }
        $data = $request->validate($rules, [
            'balances.array' => 'Saldo awal akun hanya untuk akun neraca aktif non-subledger. Gunakan tab Persediaan, Piutang, atau Utang Awal untuk akun 1-2000, 1-1002, dan 2-1000.',
        ]);

        $journal = $this->openings->post(
            $data['date'],
            $data['balances'],
            (bool) ($data['allow_additional'] ?? false),
            $data['notes'] ?? null,
        );

        return response()->json([
            'success' => true,
            'message' => "Saldo awal akun dibukukan ({$journal->entry_number}).",
            'data' => $journal->toApiArray(),
        ], 201);
    }

    /** Input saldo awal persediaan per produk (FIFO batch + jurnal Dr 1-2000 / Cr 3-1000). */
    public function storeInventory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'notes' => 'nullable|string|max:200',
            'items' => 'required|array|min:1|max:50',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100000',
            'items.*.unit_cost' => 'required|numeric|gt:0|max:1000000000',
        ], [
            'date.before_or_equal' => 'Tanggal saldo awal tidak boleh melebihi hari ini.',
            'items.*.unit_cost.gt' => 'Harga perolehan (HPP) per unit harus lebih dari Rp 0.',
        ]);

        $out = $this->subledgers->postInventoryOpening($data['date'], $data['items'], $data['notes'] ?? null, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Saldo awal persediaan {$out['reference']} dibukukan ({$out['journal']->entry_number}).",
            'data' => [
                'reference' => $out['reference'],
                'total_value' => $out['total_value'],
                'batches' => $out['batches'],
                'journal' => $out['journal']->toApiArray(),
                'valuation' => $out['valuation'],
            ],
        ], 201);
    }

    /** Daftar saldo awal piutang pelanggan (Buku Pembantu Piutang). */
    public function listReceivables(): JsonResponse
    {
        $rows = $this->subledgers->listReceivables()->map(fn ($r) => $r->toApiArray())->values();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    /** Input saldo awal piutang pelanggan (Dr 1-1002 / Cr 3-1000). */
    public function storeReceivable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_name' => 'required|string|max:150',
            'customer_phone' => 'nullable|string|max:30',
            'invoice_number' => 'nullable|string|max:100',
            'receivable_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'due_date' => 'nullable|date_format:Y-m-d|after_or_equal:receivable_date',
            'amount' => 'required|numeric|gt:0|max:10000000000',
            'notes' => 'nullable|string|max:255',
        ], [
            'receivable_date.before_or_equal' => 'Tanggal saldo awal piutang tidak boleh melebihi hari ini.',
            'due_date.after_or_equal' => 'Jatuh tempo tidak boleh sebelum tanggal piutang.',
        ]);

        $out = $this->subledgers->createReceivableOpening($data, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Saldo awal piutang {$out['receivable']->receivable_number} dibukukan ({$out['journal']->entry_number}).",
            'data' => [
                'receivable' => $out['receivable']->toApiArray(),
                'journal' => $out['journal']->toApiArray(),
            ],
        ], 201);
    }

    /** Pelunasan saldo awal piutang pelanggan (Dr 1-1000/1-1001 / Cr 1-1002). */
    public function payReceivable(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'payment_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'amount' => 'required|numeric|gt:0|max:10000000000',
            'account_code' => 'required|string|in:1-1000,1-1001',
            'notes' => 'nullable|string|max:255',
        ], [
            'payment_date.before_or_equal' => 'Tanggal pelunasan tidak boleh melebihi hari ini.',
        ]);

        $out = $this->subledgers->payReceivable($id, $data, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Pelunasan piutang {$out['receivable']->receivable_number} dibukukan ({$out['journal']->entry_number}).",
            'data' => [
                'receivable' => $out['receivable']->toApiArray(),
                'payment' => $out['payment']->toApiArray(),
                'journal' => $out['journal']->toApiArray(),
            ],
        ], 201);
    }

    /** Daftar faktur saldo awal utang supplier. */
    public function listPayables(): JsonResponse
    {
        $rows = $this->subledgers->listOpeningPayables()->map(fn ($p) => $p->toApiArray())->values();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    /** Input saldo awal utang supplier (Buku Pembantu Hutang + Dr 3-1000 / Cr 2-1000). */
    public function storePayable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'supplier_name' => 'required_without:supplier_id|nullable|string|max:150',
            'supplier_invoice' => 'nullable|string|max:100',
            'payable_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'due_date' => 'nullable|date_format:Y-m-d|after_or_equal:payable_date',
            'amount' => 'required|numeric|gt:0|max:10000000000',
            'notes' => 'nullable|string|max:255',
        ], [
            'payable_date.before_or_equal' => 'Tanggal saldo awal utang tidak boleh melebihi hari ini.',
            'due_date.after_or_equal' => 'Jatuh tempo tidak boleh sebelum tanggal utang.',
        ]);

        $out = $this->subledgers->createPayableOpening($data, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Saldo awal utang {$out['purchase']->purchase_number} dibukukan ({$out['journal']->entry_number}).",
            'data' => [
                'purchase' => $out['purchase']->toApiArray(),
                'journal' => $out['journal']->toApiArray(),
            ],
        ], 201);
    }
}
