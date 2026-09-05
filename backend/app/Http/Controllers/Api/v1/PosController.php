<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PosCheckoutRequest;
use App\Models\Account;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Services\AccountingEngine;
use App\Services\FifoCostingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosController extends Controller
{
    protected FifoCostingService $fifoService;
    protected AccountingEngine $accountingEngine;

    public function __construct(FifoCostingService $fifoService, AccountingEngine $accountingEngine)
    {
        $this->fifoService = $fifoService;
        $this->accountingEngine = $accountingEngine;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Sale::with(['details.product', 'details.allocations.batch'])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('reference', 'like', "%{$s}%")
                  ->orWhere('customer_name', 'like', "%{$s}%")
                  ->orWhere('vehicle_plate', 'like', "%{$s}%");
            });
        }

        if ($request->filled('date')) {
            $query->where('date', $request->date);
        }

        $sales = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $sales,
        ]);
    }

    public function show($id): JsonResponse
    {
        $sale = Sale::with(['details.product', 'details.allocations.batch', 'journalEntry.items.account'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $sale,
        ]);
    }

    public function checkout(PosCheckoutRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = DB::transaction(function () use ($validated) {
            $date = now()->toDateString();
            $prefix = 'OB3-INV-' . date('Ym') . '-';

            $lastSale = Sale::where('reference', 'like', $prefix . '%')
                ->orderBy('reference', 'desc')
                ->first();

            $seq = 1;
            if ($lastSale) {
                $parts = explode('-', $lastSale->reference);
                $seq = (int) end($parts) + 1;
            }

            $reference = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

            // Compute totals
            $grossSales = 0.00;
            $totalDiscount = (float) ($validated['discount_amount'] ?? 0);
            $taxAmount = (float) ($validated['tax_amount'] ?? 0);
            $productSubtotal = 0.00;
            $serviceSubtotal = 0.00;

            foreach ($validated['items'] as $item) {
                $itemSub = (float) $item['sub_total'];
                $grossSales += $itemSub;
                if (!empty($item['product_id'])) {
                    $productSubtotal += $itemSub;
                } else {
                    $serviceSubtotal += $itemSub;
                }
            }

            $grandTotal = ($grossSales - $totalDiscount) + $taxAmount;
            $paidAmount = (float) $validated['paid_amount'];

            $sale = Sale::create([
                'reference' => $reference,
                'date' => $date,
                'customer_name' => $validated['customer_name'] ?? 'Pelanggan Walk-In',
                'vehicle_plate' => $validated['vehicle_plate'] ?? 'Umum',
                'cashier_name' => $validated['cashier_name'] ?? 'Fani A.',
                'gross_sales_amount' => $grossSales,
                'discount_amount' => $totalDiscount,
                'tax_percentage' => $taxAmount > 0 ? 11.00 : 0.00,
                'tax_amount' => $taxAmount,
                'total_amount' => $grandTotal,
                'paid_amount' => $paidAmount,
                'payment_method' => $validated['payment_method'],
                'total_hpp' => 0.00,
                'total_profit' => 0.00,
                'notes' => $validated['notes'] ?? null,
                'status' => 'LUNAS',
                'stock_deducted' => true,
                'branch_id' => 3,
            ]);

            $totalSaleHpp = 0.00;

            foreach ($validated['items'] as $item) {
                $saleDetail = SaleDetail::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'sub_total' => $item['sub_total'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'unit_cost_hpp' => 0.00,
                    'total_cost_hpp' => 0.00,
                    'profit_amount' => 0.00,
                ]);

                // Deduct FIFO inventory for physical products
                if (!empty($item['product_id'])) {
                    $fifoRes = $this->fifoService->allocateFifo(
                        (int) $item['product_id'],
                        (int) $item['quantity'],
                        $saleDetail->id,
                        $reference
                    );

                    $lineHpp = $fifoRes['total_cogs'];
                    $totalSaleHpp += $lineHpp;

                    $saleDetail->unit_cost_hpp = $item['quantity'] > 0 ? round($lineHpp / $item['quantity'], 2) : 0;
                    $saleDetail->total_cost_hpp = $lineHpp;
                    $saleDetail->profit_amount = round($saleDetail->sub_total - $lineHpp, 2);
                    $saleDetail->save();
                } else {
                    $saleDetail->profit_amount = $saleDetail->sub_total;
                    $saleDetail->save();
                }
            }

            $sale->total_hpp = $totalSaleHpp;
            $sale->total_profit = round(($grandTotal - $taxAmount) - $totalSaleHpp, 2);
            $sale->save();

            // Auto-Journaling Double-Entry SAK EMKM
            $paymentAccountCode = match ($validated['payment_method']) {
                'TUNAI' => '1-1000',
                'TRANSFER_BCA', 'QRIS', 'KARTU_DEBIT' => '1-1001',
                'KREDIT' => '1-1002',
                default => '1-1000',
            };

            $accPayment = Account::where('account_code', $paymentAccountCode)->firstOrFail();
            $journalItems = [];

            // 1. [DEBIT] Cash / Bank / Receivable = Grand Total
            $journalItems[] = [
                'account_id' => $accPayment->id,
                'debit' => $grandTotal,
                'credit' => 0.00,
                'note' => "Penerimaan {$validated['payment_method']} Nota {$reference}",
            ];

            // 2. [DEBIT] Sales Discount (if any)
            if ($totalDiscount > 0) {
                $accDiscount = Account::where('account_code', '4-9000')->firstOrFail();
                $journalItems[] = [
                    'account_id' => $accDiscount->id,
                    'debit' => $totalDiscount,
                    'credit' => 0.00,
                    'note' => "Diskon Penjualan Nota {$reference}",
                ];
            }

            // 3. [KREDIT] Sales Revenue - Ban Baru
            if ($productSubtotal > 0) {
                $accSalesProduct = Account::where('account_code', '4-1000')->firstOrFail();
                $journalItems[] = [
                    'account_id' => $accSalesProduct->id,
                    'debit' => 0.00,
                    'credit' => $productSubtotal,
                    'note' => "Pendapatan Ban Baru Nota {$reference}",
                ];
            }

            // 4. [KREDIT] Sales Revenue - Jasa
            if ($serviceSubtotal > 0) {
                $accSalesService = Account::where('account_code', '4-1001')->firstOrFail();
                $journalItems[] = [
                    'account_id' => $accSalesService->id,
                    'debit' => 0.00,
                    'credit' => $serviceSubtotal,
                    'note' => "Pendapatan Jasa Servis Nota {$reference}",
                ];
            }

            // 5. [KREDIT] Tax Output PPN (if any)
            if ($taxAmount > 0) {
                $accTax = Account::where('account_code', '2-1003')->firstOrFail();
                $journalItems[] = [
                    'account_id' => $accTax->id,
                    'debit' => 0.00,
                    'credit' => $taxAmount,
                    'note' => "PPN Keluaran 11% Nota {$reference}",
                ];
            }

            // 6. [DEBIT] HPP & [KREDIT] Persediaan
            if ($totalSaleHpp > 0) {
                $accHpp = Account::where('account_code', '5-1000')->firstOrFail();
                $accInventory = Account::where('account_code', '1-2000')->firstOrFail();
                $journalItems[] = [
                    'account_id' => $accHpp->id,
                    'debit' => $totalSaleHpp,
                    'credit' => 0.00,
                    'note' => "Beban Pokok Penjualan FIFO Nota {$reference}",
                ];
                $journalItems[] = [
                    'account_id' => $accInventory->id,
                    'debit' => 0.00,
                    'credit' => $totalSaleHpp,
                    'note' => "Pengurangan Persediaan Ban Baru Nota {$reference}",
                ];
            }

            $journalEntry = $this->accountingEngine->createEntry(
                'POS_SALE',
                $reference,
                "Penjualan POS Kasir Nota {$reference} ({$sale->customer_name})",
                $journalItems,
                $date,
                3
            );

            return [
                'sale' => $sale->load(['details.product', 'details.allocations']),
                'journal_entry_number' => $journalEntry->entry_number,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Transaksi checkout POS berhasil diproses',
            'data' => [
                'id' => $result['sale']->id,
                'reference' => $result['sale']->reference,
                'grand_total' => $result['sale']->total_amount,
                'total_hpp' => $result['sale']->total_hpp,
                'total_profit' => $result['sale']->total_profit,
                'journal_entry_number' => $result['journal_entry_number'],
                'sale' => $result['sale'],
            ],
        ], 201);
    }
}
