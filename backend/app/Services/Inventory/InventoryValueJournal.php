<?php

namespace App\Services\Inventory;

use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Menjaga saldo buku Persediaan (1-2000) sama dengan nilai FIFO fisik (Σ sisa × biaya batch).
 *
 * Operasi di luar penjualan & pembelian (opname, rekonsiliasi, edit buku stok, stok awal produk baru)
 * dijalankan lewat record(): nilai FIFO per produk diukur sebelum dan sesudah, lalu selisihnya dijurnal.
 */
class InventoryValueJournal
{
    public const INVENTORY = '1-2000';
    public const OPENING_EQUITY = '3-1000';
    public const OPNAME_VARIANCE = '5-2000';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public static function value(): float
    {
        return round((float) ProductBatch::sum(DB::raw('remaining_qty * batch_cost')), 2);
    }

    public static function ledgerBalance(): float
    {
        $accountId = DB::table('accounts')->where('account_code', self::INVENTORY)->value('id');

        return round((float) JournalItem::where('account_id', $accountId)->sum(DB::raw('debit - credit')), 2);
    }

    public static function summary(): array
    {
        $fifo = self::value();
        $ledger = self::ledgerBalance();

        return ['fifo_value' => $fifo, 'ledger_balance' => $ledger, 'difference' => round($fifo - $ledger, 2)];
    }

    /**
     * Jalankan $operation lalu jurnal perubahan nilai persediaannya.
     * Produk yang belum ada sebelum operasi dianggap saldo awal (Cr Modal 3-1000); produk lama → selisih opname (5-2000).
     *
     * @template T
     * @param  callable(): T  $operation
     * @return array{result: T, journal: ?JournalEntry}
     */
    public function record(callable $operation, string $referenceType, string $referenceId, string $description): array
    {
        return DB::transaction(function () use ($operation, $referenceType, $referenceId, $description) {
            $existing = Product::withTrashed()->pluck('id')->flip();
            $before = self::valuesByProduct();

            $result = $operation();

            $after = self::valuesByProduct();
            $delta = [self::OPNAME_VARIANCE => 0.0, self::OPENING_EQUITY => 0.0];
            foreach ($before + $after as $productId => $_) {
                $diff = ($after[$productId] ?? 0.0) - ($before[$productId] ?? 0.0);
                $delta[$existing->has($productId) ? self::OPNAME_VARIANCE : self::OPENING_EQUITY] += $diff;
            }

            return ['result' => $result, 'journal' => $this->postDeltas($delta, $referenceType, $referenceId, $description)];
        });
    }

    /**
     * Bukukan selisih antara nilai FIFO dan saldo buku 1-2000 sebagai saldo awal persediaan (idempoten).
     */
    public function postOpeningBalance(): ?JournalEntry
    {
        return DB::transaction(function () {
            $difference = self::summary()['difference'];
            $reference = 'OPENING-INV-'.now()->format('YmdHis');

            return $this->postDeltas(
                [self::OPENING_EQUITY => $difference],
                'OPENING_BALANCE',
                $reference,
                'Saldo awal persediaan ban (penyesuaian nilai FIFO ke buku besar)'
            );
        });
    }

    /**
     * @return array<int, float> nilai FIFO per product_id
     */
    private static function valuesByProduct(): array
    {
        return ProductBatch::groupBy('product_id')
            ->selectRaw('product_id, SUM(remaining_qty * batch_cost) as v')
            ->pluck('v', 'product_id')
            ->map(fn ($v) => round((float) $v, 2))
            ->all();
    }

    /**
     * @param  array<string, float>  $deltas  perubahan nilai persediaan per akun lawan
     */
    private function postDeltas(array $deltas, string $referenceType, string $referenceId, string $description): ?JournalEntry
    {
        $draft = new JournalDraft();
        $posted = false;

        foreach ($deltas as $counter => $amount) {
            $amount = round($amount, 2);
            if ($amount > 0) {
                $draft->debit(self::INVENTORY, $amount, "Penambahan nilai persediaan ({$referenceId})")
                    ->credit($counter, $amount, $description);
                $posted = true;
            } elseif ($amount < 0) {
                $draft->debit($counter, -$amount, $description)
                    ->credit(self::INVENTORY, -$amount, "Pengurangan nilai persediaan ({$referenceId})");
                $posted = true;
            }
        }

        return $posted ? $draft->post($this->engine, $referenceType, $referenceId, $description) : null;
    }
}
