<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\OpeningReceivable;
use App\Models\OpeningReceivablePayment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\FifoCostingService;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Pencatatan saldo awal buku pembantu sesuai SAK EMKM:
 * 1. Saldo Awal Persediaan (1-2000) → batch FIFO + jurnal Dr 1-2000 / Cr 3-1000
 * 2. Saldo Awal Piutang (1-1002) → buku pembantu piutang + jurnal Dr 1-1002 / Cr 3-1000 (+ pelunasan)
 * 3. Saldo Awal Utang (2-1000) → buku pembantu hutang supplier (purchases TEMPO) + jurnal Dr 3-1000 / Cr 2-1000
 */
class OpeningSubledgerService
{
    public const INVENTORY_PREFIX = 'SA-INV';
    public const RECEIVABLE_PREFIX = 'SA-PIU';
    public const PAYABLE_PREFIX = 'SA-HUT';

    public const RECEIVABLE_ACCOUNT = '1-1002';
    public const INVENTORY_ACCOUNT = '1-2000';
    public const PAYABLE_ACCOUNT = '2-1000';
    public const CAPITAL_ACCOUNT = '3-1000';

    public function __construct(
        private readonly AccountingEngine $engine,
        private readonly FifoCostingService $fifo,
    ) {
    }

    /**
     * Input saldo awal persediaan per produk (FIFO batch + jurnal seimbang Dr 1-2000 / Cr 3-1000).
     *
     * @param  list<array{product_id: int, quantity: int, unit_cost: float|int|string}>  $items
     * @return array{reference: string, total_value: float, batches: list<array>, journal: JournalEntry, valuation: array}
     */
    public function postInventoryOpening(string $date, array $items, ?string $notes, ?User $user): array
    {
        return DB::transaction(function () use ($date, $items, $notes, $user) {
            PeriodLock::assertOpen($date);

            if (count($items) === 0) {
                throw new PosRuleException('Tambahkan minimal satu produk untuk saldo awal persediaan.');
            }

            // Urutkan & kunci produk berdasar ID naik agar bebas deadlock (mengikuti lock order inventori).
            $productIds = collect($items)->pluck('product_id')->map(fn ($id) => (int) $id)->unique()->sort()->values()->all();
            $products = Product::whereIn('id', $productIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            $reference = DocumentNumber::next(JournalEntry::class, 'reference_id', self::INVENTORY_PREFIX, $date);
            $draft = new JournalDraft();
            $createdBatches = [];
            $totalValue = 0.0;

            foreach ($items as $item) {
                $productId = (int) $item['product_id'];
                $qty = (int) $item['quantity'];
                $unitCost = round((float) $item['unit_cost'], 2);

                /** @var Product|null $product */
                $product = $products->get($productId);
                if (! $product) {
                    throw new PosRuleException("Produk #{$productId} tidak ditemukan.");
                }
                if ($qty <= 0 || $unitCost <= 0) {
                    throw new PosRuleException("Qty dan harga perolehan (HPP) untuk {$product->product_name} harus lebih dari 0.");
                }

                $lineValue = round($qty * $unitCost, 2);
                $totalValue = round($totalValue + $lineValue, 2);

                $batch = $this->fifo->addBatch(
                    $product->id,
                    $qty,
                    $unitCost,
                    'Saldo Awal Persediaan',
                    $date,
                    3,
                    'OPENING_BALANCE',
                    "Saldo awal persediaan {$reference}".($notes ? " — {$notes}" : '')
                );

                $draft->debit(
                    self::INVENTORY_ACCOUNT,
                    $lineValue,
                    "Saldo awal {$qty} pcs {$product->product_name} @ Rp ".number_format($unitCost, 0, ',', '.')." ({$batch->batch_code})"
                );

                $createdBatches[] = [
                    'id' => $batch->id,
                    'batch_code' => $batch->batch_code,
                    'product_id' => $product->id,
                    'product_name' => $product->product_name,
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'total_value' => $lineValue,
                ];
            }

            $draft->credit(
                self::CAPITAL_ACCOUNT,
                $totalValue,
                "Modal awal pemilik — saldo awal persediaan ({$reference})"
            );

            $desc = "Saldo awal persediaan ({$reference}, ".count($createdBatches).' item)'
                .($notes ? ": {$notes}" : '');
            $journal = $draft->post($this->engine, 'OPENING_BALANCE', $reference, $desc, $date);

            return [
                'reference' => $reference,
                'total_value' => $totalValue,
                'batches' => $createdBatches,
                'journal' => $journal,
                'valuation' => InventoryValueJournal::summary() + [
                    'opening_posted' => InventoryValueJournal::openingEntry() !== null,
                ],
            ];
        }, 3);
    }

    /**
     * @return Collection<int, OpeningReceivable>
     */
    public function listReceivables(): Collection
    {
        return OpeningReceivable::with('payments')
            ->orderByDesc('receivable_date')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Input saldo awal piutang pelanggan (Buku Pembantu Piutang + Dr 1-1002 / Cr 3-1000).
     *
     * @return array{receivable: OpeningReceivable, journal: JournalEntry}
     */
    public function createReceivableOpening(array $data, ?User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $date = Carbon::parse($data['receivable_date'])->toDateString();
            PeriodLock::assertOpen($date);

            $amount = round((float) $data['amount'], 2);
            if ($amount <= 0) {
                throw new PosRuleException('Nominal saldo awal piutang harus lebih dari 0.');
            }

            $dueDate = ! empty($data['due_date']) ? Carbon::parse($data['due_date'])->toDateString() : null;
            if ($dueDate !== null && $dueDate < $date) {
                throw new PosRuleException('Tanggal jatuh tempo piutang tidak boleh sebelum tanggal saldo awal.');
            }

            // Pastikan akun 1-1002 aktif di COA.
            Account::where('account_code', self::RECEIVABLE_ACCOUNT)->update(['is_active' => true]);

            $number = DocumentNumber::next(OpeningReceivable::class, 'receivable_number', self::RECEIVABLE_PREFIX, $date);
            $customerName = trim((string) $data['customer_name']);
            $invoiceNo = ! empty($data['invoice_number']) ? trim((string) $data['invoice_number']) : null;
            $notes = ! empty($data['notes']) ? trim((string) $data['notes']) : null;

            $invLabel = $invoiceNo ? " (Ref: {$invoiceNo})" : '';
            $journal = (new JournalDraft())
                ->debit(self::RECEIVABLE_ACCOUNT, $amount, "Saldo awal piutang {$customerName}{$invLabel}")
                ->credit(self::CAPITAL_ACCOUNT, $amount, "Modal awal pemilik — saldo awal piutang {$customerName}")
                ->post(
                    $this->engine,
                    'RECEIVABLE_OPENING',
                    $number,
                    "Saldo awal piutang {$customerName}{$invLabel}".($notes ? " — {$notes}" : ''),
                    $date
                );

            $receivable = OpeningReceivable::create([
                'receivable_number' => $number,
                'customer_name' => $customerName,
                'customer_phone' => ! empty($data['customer_phone']) ? trim((string) $data['customer_phone']) : null,
                'invoice_number' => $invoiceNo,
                'receivable_date' => $date,
                'due_date' => $dueDate,
                'total_amount' => $amount,
                'paid_amount' => 0,
                'status' => 'BELUM_LUNAS',
                'journal_entry_number' => $journal->entry_number,
                'notes' => $notes,
                'operator_name' => $user?->name,
            ]);

            return [
                'receivable' => $receivable->load('payments'),
                'journal' => $journal,
            ];
        }, 3);
    }

    /**
     * Penerimaan pelunasan piutang saldo awal (Dr 1-1000/1-1001 / Cr 1-1002).
     *
     * @return array{receivable: OpeningReceivable, payment: OpeningReceivablePayment, journal: JournalEntry}
     */
    public function payReceivable(int $receivableId, array $data, ?User $user): array
    {
        return DB::transaction(function () use ($receivableId, $data, $user) {
            $receivable = OpeningReceivable::lockForUpdate()->findOrFail($receivableId);
            if ($receivable->status === 'LUNAS') {
                throw new PosRuleException("Piutang {$receivable->receivable_number} sudah lunas.");
            }

            $amount = round((float) $data['amount'], 2);
            $remaining = $receivable->remaining();
            if ($amount <= 0) {
                throw new PosRuleException('Nominal pelunasan harus lebih dari 0.');
            }
            if ($amount > $remaining + 0.001) {
                throw new PosRuleException('Pembayaran melebihi sisa piutang (Rp '.number_format($remaining, 0, ',', '.').').');
            }

            $date = Carbon::parse($data['payment_date'] ?? now())->toDateString();
            PeriodLock::assertOpen($date);
            $recDate = $receivable->receivable_date->toDateString();
            if ($date < $recDate) {
                throw new PosRuleException("Tanggal pelunasan {$date} sebelum tanggal piutang {$recDate}.");
            }

            $accountCode = (string) $data['account_code'];
            if (! in_array($accountCode, ['1-1000', '1-1001'], true)) {
                throw new PosRuleException('Akun penerimaan pelunasan piutang harus Kas Laci (1-1000) atau Bank BCA (1-1001).');
            }

            $notes = ! empty($data['notes']) ? trim((string) $data['notes']) : null;
            $journal = (new JournalDraft())
                ->debit($accountCode, $amount, "Penerimaan pelunasan piutang {$receivable->customer_name} ({$receivable->receivable_number})")
                ->credit(self::RECEIVABLE_ACCOUNT, $amount, "Pelunasan piutang {$receivable->receivable_number}")
                ->post(
                    $this->engine,
                    'RECEIVABLE_PAYMENT',
                    $receivable->receivable_number,
                    "Pelunasan piutang {$receivable->customer_name}".($notes ? " ({$notes})" : ''),
                    $date
                );

            $payment = OpeningReceivablePayment::create([
                'opening_receivable_id' => $receivable->id,
                'payment_date' => $date,
                'amount' => $amount,
                'account_code' => $accountCode,
                'notes' => $notes,
                'operator_name' => $user?->name,
                'journal_entry_number' => $journal->entry_number,
            ]);

            $paid = round((float) $receivable->paid_amount + $amount, 2);
            $receivable->update([
                'paid_amount' => $paid,
                'status' => $paid >= (float) $receivable->total_amount - 0.001 ? 'LUNAS' : 'SEBAGIAN',
            ]);

            return [
                'receivable' => $receivable->fresh('payments'),
                'payment' => $payment,
                'journal' => $journal,
            ];
        }, 3);
    }

    /**
     * Daftar faktur saldo awal utang supplier.
     *
     * @return Collection<int, Purchase>
     */
    public function listOpeningPayables(): Collection
    {
        return Purchase::with('payments')
            ->where('purchase_number', 'like', self::PAYABLE_PREFIX.'-%')
            ->orderByDesc('purchase_date')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Input saldo awal utang supplier (masuk ke Buku Pembantu Hutang `purchases` TEMPO + Dr 3-1000 / Cr 2-1000).
     * Pelunasan selanjutnya otomatis memakai PayableService (Dr 2-1000 / Cr Kas atau Bank).
     *
     * @return array{purchase: Purchase, journal: JournalEntry}
     */
    public function createPayableOpening(array $data, ?User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $date = Carbon::parse($data['payable_date'])->toDateString();
            PeriodLock::assertOpen($date);

            $amount = round((float) $data['amount'], 2);
            if ($amount <= 0) {
                throw new PosRuleException('Nominal saldo awal utang harus lebih dari 0.');
            }

            $supplier = ! empty($data['supplier_id']) ? Supplier::findOrFail($data['supplier_id']) : null;
            $supplierName = $supplier?->supplier_name ?? trim((string) ($data['supplier_name'] ?? ''));
            if ($supplierName === '') {
                throw new PosRuleException('Pilih supplier atau isi nama supplier untuk saldo awal utang.');
            }

            $dueDate = ! empty($data['due_date'])
                ? Carbon::parse($data['due_date'])->toDateString()
                : Carbon::parse($date)->addDays($supplier?->payment_terms_days ?: 30)->toDateString();
            if ($dueDate < $date) {
                throw new PosRuleException('Tanggal jatuh tempo utang tidak boleh sebelum tanggal saldo awal.');
            }

            $purchaseNumber = DocumentNumber::next(Purchase::class, 'purchase_number', self::PAYABLE_PREFIX, $date);
            $supplierInvoice = ! empty($data['supplier_invoice']) ? trim((string) $data['supplier_invoice']) : null;
            $notes = ! empty($data['notes']) ? trim((string) $data['notes']) : null;
            $invLabel = $supplierInvoice ? " (Faktur: {$supplierInvoice})" : '';

            $journal = (new JournalDraft())
                ->debit(self::CAPITAL_ACCOUNT, $amount, "Penyesuaian modal awal — saldo awal hutang {$supplierName}")
                ->credit(self::PAYABLE_ACCOUNT, $amount, "Saldo awal hutang dagang {$supplierName}{$invLabel}")
                ->post(
                    $this->engine,
                    'PAYABLE_OPENING',
                    $purchaseNumber,
                    "Saldo awal hutang supplier {$supplierName}{$invLabel}".($notes ? " — {$notes}" : ''),
                    $date
                );

            $purchase = Purchase::create([
                'purchase_number' => $purchaseNumber,
                'supplier_id' => $supplier?->id,
                'supplier_name' => $supplierName,
                'supplier_invoice' => $supplierInvoice,
                'purchase_date' => $date,
                'payment_method' => 'TEMPO',
                'due_date' => $dueDate,
                'total_amount' => $amount,
                'dpp_amount' => 0,
                'ppn_amount' => 0,
                'paid_amount' => 0,
                'returned_amount' => 0,
                'status' => 'BELUM_LUNAS',
                'journal_entry_number' => $journal->entry_number,
                'notes' => $notes ? "[Saldo Awal Utang] {$notes}" : '[Saldo Awal Utang]',
                'operator_name' => $user?->name,
            ]);

            return [
                'purchase' => $purchase->fresh('batches.product'),
                'journal' => $journal,
            ];
        }, 3);
    }
}
