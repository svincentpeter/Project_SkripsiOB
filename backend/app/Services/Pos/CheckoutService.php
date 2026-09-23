<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Models\SalesBooking;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use App\Services\FifoCostingService;
use App\Services\Payment\MidtransQrisService;
use Illuminate\Support\Facades\DB;

/**
 * Checkout POS: server menghitung ulang seluruh angka dari baris keranjang dan pembayaran,
 * memotong stok FIFO, lalu membukukan jurnal SAK EMKM dalam satu transaksi DB.
 */
class CheckoutService
{
    public function __construct(
        private readonly FifoCostingService $fifo,
        private readonly AccountingEngine $engine,
        private readonly MidtransQrisService $qris,
    ) {
    }

    public function checkout(array $data, ?User $user): Sale
    {
        return DB::transaction(function () use ($data, $user) {
            $booking = $this->lockActiveBooking($data['booking_id'] ?? null);
            $lines = CartLines::build($data['items'], reserveStock: true);

            $subtotal = round(array_sum(array_column($lines, 'net')), 2);
            $notaDiscount = round((float) ($data['discount_amount'] ?? 0), 2);
            if ($notaDiscount > $subtotal) {
                throw new PosRuleException('Diskon nota melebihi subtotal belanja.');
            }
            $taxRate = (float) ($data['tax_rate'] ?? 0);
            $taxable = round($subtotal - $notaDiscount, 2);
            $tax = round($taxable * $taxRate / 100);
            $grandTotal = round($taxable + $tax, 2);

            $dpApplied = $booking ? (float) $booking->dp_amount : 0.0;
            if ($dpApplied > $grandTotal) {
                throw new PosRuleException('DP booking melebihi total tagihan nota.');
            }
            $amountDue = round($grandTotal - $dpApplied, 2);

            $isBon = ! empty($data['bon']);
            $payments = $this->buildPayments($data['payments'] ?? [], $amountDue, $isBon);

            $reference = DocumentNumber::next(Sale::class, 'reference', 'OB3-INV');
            $date = now()->toDateString();
            $single = count($payments) === 1 ? $payments[0] : null;

            $sale = Sale::create([
                'reference' => $reference,
                'date' => $date,
                'customer_name' => $data['customer_name'] ?? 'Pelanggan Walk-In',
                'customer_phone' => $data['customer_phone'] ?? null,
                'vehicle_plate' => $data['vehicle_plate'] ?? 'Umum',
                'vehicle_model' => $data['vehicle_model'] ?? null,
                'cashier_name' => $user?->name ?? 'Kasir POS',
                'gross_sales_amount' => round(array_sum(array_column($lines, 'gross')), 2),
                'discount_amount' => round(array_sum(array_column($lines, 'discount')) + $notaDiscount, 2),
                'tax_percentage' => $taxRate,
                'tax_amount' => $tax,
                'total_amount' => round($grandTotal + array_sum(array_column($payments, 'surcharge_amount')), 2),
                'paid_amount' => round(array_sum(array_map(fn ($p) => $p['amount'] + $p['surcharge_amount'], $payments)), 2),
                'change_amount' => round(array_sum(array_column($payments, 'change_amount')), 2),
                'dp_applied' => $dpApplied,
                'booking_id' => $booking?->id,
                'payment_method' => $isBon ? 'BON' : ($single['method'] ?? 'SPLIT'),
                'payment_reference' => $single['reference'] ?? null,
                'payment_provider' => $single['provider_name'] ?? null,
                'edc_bank' => $single['edc_bank'] ?? null,
                'edc_type' => $single['edc_type'] ?? null,
                'fee_percentage' => $single['fee_percentage'] ?? 0,
                'fee_amount' => round(array_sum(array_column($payments, 'fee_amount')), 2),
                'surcharge_amount' => round(array_sum(array_column($payments, 'surcharge_amount')), 2),
                'net_received' => round(array_sum(array_column($payments, 'net_received')), 2),
                'total_hpp' => 0,
                'total_profit' => 0,
                'notes' => $data['notes'] ?? null,
                'status' => $isBon ? 'PENDING' : 'LUNAS',
                'due_date' => $isBon ? now()->addDays((int) $data['bon']['term_days'])->toDateString() : null,
                'stock_deducted' => true,
                'branch_id' => 3,
            ]);

            $fifoCogs = $this->storeLines($sale, $lines);
            $manualCost = round(array_sum(array_map(fn ($l) => $l['manual_cost'] * $l['quantity'], $lines)), 2);
            $sale->update([
                'total_hpp' => round($fifoCogs + $manualCost, 2),
                'total_profit' => round($taxable - $fifoCogs - $manualCost, 2),
            ]);

            foreach ($payments as $payment) {
                SalePayment::create(['sale_id' => $sale->id] + $payment);
            }

            $this->postJournal($sale, $lines, $payments, $notaDiscount, $tax, $dpApplied, $isBon ? $amountDue : 0.0, $fifoCogs);

            if ($booking) {
                $booking->update(['status' => 'CONVERTED', 'converted_sale_id' => $sale->id]);
            }

            return $sale->fresh();
        });
    }

    private function lockActiveBooking(?int $bookingId): ?SalesBooking
    {
        if (! $bookingId) {
            return null;
        }
        $booking = SalesBooking::lockForUpdate()->find($bookingId);
        if (! $booking || $booking->status !== 'ACTIVE') {
            throw new PosRuleException('Booking DP tidak aktif atau sudah dipakai.');
        }

        return $booking;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildPayments(array $input, float $amountDue, bool $isBon): array
    {
        if ($isBon) {
            if (! empty($input)) {
                throw new PosRuleException('Nota BON tidak boleh disertai pembayaran; pelunasan dicatat di piutang.');
            }

            return [];
        }

        $payments = [];
        foreach ($input as $row) {
            $method = $row['method'];
            $amount = round((float) $row['amount'], 2);
            $pct = $method === 'TUNAI' ? 0.0 : (float) ($row['fee_percentage'] ?? 0);
            $chargeToCustomer = $method === 'EDC_CREDIT' && ! empty($row['charge_to_customer']);

            $tendered = $amount;
            if ($method === 'TUNAI') {
                $tendered = round((float) ($row['tendered'] ?? $amount), 2);
                if ($tendered < $amount) {
                    throw new PosRuleException('Uang tunai yang diterima kurang dari nominal pembayaran tunai.');
                }
            }

            if ($method === 'QRIS' && ! empty($row['reference'])) {
                $status = $this->qris->checkStatus($row['reference'])['transaction_status'] ?? 'pending';
                if (! in_array($status, ['settlement', 'capture'], true)) {
                    throw new PosRuleException('Pembayaran QRIS belum diterima (status: '.$status.').');
                }
            }

            $surcharge = $chargeToCustomer ? round($amount * $pct / 100) : 0.0;
            $fee = $chargeToCustomer ? $surcharge : round($amount * $pct / 100);

            $payments[] = [
                'method' => $method,
                'account_code' => PosAccounts::forMethod($method),
                'amount' => $amount,
                'tendered_amount' => $tendered,
                'change_amount' => round($tendered - $amount, 2),
                'fee_percentage' => $pct,
                'fee_amount' => $fee,
                'surcharge_amount' => $surcharge,
                'net_received' => round($amount + $surcharge - $fee, 2),
                'provider_name' => $row['provider_name'] ?? null,
                'edc_bank' => $row['edc_bank'] ?? null,
                'edc_type' => $row['edc_type'] ?? null,
                'reference' => $row['reference'] ?? null,
            ];
        }

        $paid = round(array_sum(array_column($payments, 'amount')), 2);
        if (abs($paid - $amountDue) > 0.001) {
            throw new PosRuleException(
                'Total pembayaran (Rp '.number_format($paid, 0, ',', '.').') tidak sama dengan tagihan (Rp '.number_format($amountDue, 0, ',', '.').').'
            );
        }

        return $payments;
    }

    /**
     * Simpan baris nota; baris produk katalog memotong stok FIFO. Mengembalikan total HPP FIFO.
     */
    private function storeLines(Sale $sale, array $lines): float
    {
        $fifoCogs = 0.0;

        foreach ($lines as $line) {
            $detail = SaleDetail::create([
                'sale_id' => $sale->id,
                'product_id' => $line['product']?->id,
                'item_type' => $line['type'],
                'item_name' => $line['name'],
                'service_id' => $line['service_id'],
                'is_manual' => $line['is_manual'],
                'quantity' => $line['quantity'],
                'unit_price' => $line['unit_price'],
                'sub_total' => $line['net'],
                'discount_amount' => $line['discount'],
                'unit_cost_hpp' => $line['manual_cost'],
                'total_cost_hpp' => round($line['manual_cost'] * $line['quantity'], 2),
                'profit_amount' => round($line['net'] - $line['manual_cost'] * $line['quantity'], 2),
            ]);

            if ($line['product']) {
                $cogs = $this->fifo->allocateFifo($line['product']->id, $line['quantity'], $detail->id, $sale->reference)['total_cogs'];
                $fifoCogs += $cogs;
                $detail->update([
                    'unit_cost_hpp' => round($cogs / $line['quantity'], 2),
                    'total_cost_hpp' => $cogs,
                    'profit_amount' => round($line['net'] - $cogs, 2),
                ]);
            }
        }

        return round($fifoCogs, 2);
    }

    private function postJournal(Sale $sale, array $lines, array $payments, float $notaDiscount, float $tax, float $dpApplied, float $receivable, float $fifoCogs): void
    {
        $ref = $sale->reference;
        $draft = new JournalDraft();

        foreach ($payments as $p) {
            $draft->debit($p['account_code'], $p['net_received'], "Penerimaan {$p['method']} Nota {$ref}");
        }
        $draft->debit(PosAccounts::MDR_EXPENSE, array_sum(array_column($payments, 'fee_amount')), "Beban MDR QRIS/EDC Nota {$ref}");
        $draft->debit(PosAccounts::CUSTOMER_DEPOSIT, $dpApplied, "Pemakaian DP booking Nota {$ref}");
        $draft->debit(PosAccounts::RECEIVABLE, $receivable, "Piutang BON Nota {$ref}");
        $draft->debit(PosAccounts::SALES_DISCOUNT, array_sum(array_column($lines, 'discount')) + $notaDiscount, "Diskon penjualan Nota {$ref}");

        $goods = array_sum(array_map(fn ($l) => $l['type'] === 'PRODUCT' ? $l['gross'] : 0, $lines));
        $services = array_sum(array_map(fn ($l) => $l['type'] === 'SERVICE' ? $l['gross'] : 0, $lines));
        $draft->credit(PosAccounts::REVENUE_GOODS, $goods, "Pendapatan ban & barang Nota {$ref}");
        $draft->credit(PosAccounts::REVENUE_SERVICE, $services, "Pendapatan jasa Nota {$ref}");
        $draft->credit(PosAccounts::VAT_OUT, $tax, "PPN keluaran Nota {$ref}");
        $draft->credit(PosAccounts::SURCHARGE, array_sum(array_column($payments, 'surcharge_amount')), "Surcharge kartu kredit Nota {$ref}");

        $draft->debit(PosAccounts::COGS, $fifoCogs, "HPP FIFO Nota {$ref}");
        $draft->credit(PosAccounts::INVENTORY, $fifoCogs, "Pengurangan persediaan Nota {$ref}");

        $draft->post($this->engine, 'POS_SALE', $ref, "Penjualan POS Kasir Nota {$ref} ({$sale->customer_name})", $sale->date->toDateString());
    }
}
