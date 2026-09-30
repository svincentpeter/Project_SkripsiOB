<?php

namespace Tests\Concerns;

use App\Models\CashSession;
use App\Models\JournalEntry;
use App\Models\PaymentProviderSetting;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\QrisTransaction;
use App\Models\Sale;

trait CreatesPosFixtures
{
    /**
     * Produk dengan satu atau beberapa batch FIFO: [[qty, cost, 'Y-m-d'], ...].
     */
    protected function makeProduct(int $price = 1000000, array $batches = [[10, 600000, '2026-08-01']]): Product
    {
        $unique = uniqid();
        $qty = array_sum(array_column($batches, 0));
        $product = Product::create([
            'product_name' => 'Ban Test '.$unique,
            'product_code' => 'T-'.$unique,
            'barcode' => 'BC-'.$unique,
            'brand' => 'Bridgestone',
            'product_cost' => $batches[0][1],
            'product_price' => $price,
            'product_quantity' => $qty,
            'is_active' => true,
        ]);

        foreach ($batches as $i => [$bQty, $cost, $date]) {
            ProductBatch::create([
                'product_id' => $product->id,
                'batch_code' => "B-{$unique}-{$i}",
                'source_name' => 'PT Test',
                'purchase_date' => $date,
                'batch_cost' => $cost,
                'initial_qty' => $bQty,
                'remaining_qty' => $bQty,
            ]);
        }

        return $product;
    }

    protected function productLine(Product $product, int $qty = 1, ?float $price = null, float $discountPerItem = 0): array
    {
        return [
            'type' => 'PRODUCT',
            'product_id' => $product->id,
            'name' => $product->product_name,
            'quantity' => $qty,
            'unit_price' => $price ?? (float) $product->product_price,
            'discount_per_item' => $discountPerItem,
        ];
    }

    /**
     * @return array<string, array{debit: float, credit: float}>
     */
    protected function journalByAccount(string $reference, string $type = 'POS_SALE'): array
    {
        $entry = JournalEntry::with('items.account')
            ->where('reference_id', $reference)
            ->where('reference_type', $type)
            ->firstOrFail();

        $this->assertEqualsWithDelta((float) $entry->total_debit, (float) $entry->total_credit, 0.01, 'Jurnal tidak seimbang');

        $map = [];
        foreach ($entry->items as $item) {
            $code = $item->account->account_code;
            $map[$code]['debit'] = ($map[$code]['debit'] ?? 0) + (float) $item->debit;
            $map[$code]['credit'] = ($map[$code]['credit'] ?? 0) + (float) $item->credit;
        }

        return $map;
    }

    /** Provider pembayaran server (method_type bank/qris) dengan MDR dan ambang sendiri. */
    protected function paymentProvider(string $type = 'qris', float $feePct = 0, float $threshold = 0, bool $active = true): PaymentProviderSetting
    {
        return PaymentProviderSetting::create([
            'method_type' => $type,
            'provider_name' => strtoupper($type).' Test '.uniqid(),
            'fee_percentage' => $feePct,
            'fee_threshold_amount' => $threshold,
            'is_active' => $active,
        ]);
    }

    /** Order QRIS Midtrans yang sudah tercatat (default lunas lewat webhook). Mengembalikan order id. */
    protected function qrisOrder(float $gross, string $status = 'settlement'): string
    {
        $orderId = 'POS-T-'.uniqid();
        QrisTransaction::create([
            'order_id' => $orderId,
            'gross_amount' => $gross,
            'transaction_status' => $status,
            'settlement_source' => $status === 'settlement' ? QrisTransaction::SOURCE_WEBHOOK : null,
            'settled_at' => $status === 'settlement' ? now() : null,
        ]);

        return $orderId;
    }

    protected function checkout(array $payload)
    {
        if (collect($payload['payments'] ?? [])->contains('method', 'TUNAI')) {
            $this->ensureCashSession();
        }

        return $this->postJson('/api/v1/pos/checkout', $payload + ['customer_name' => 'Budi', 'vehicle_plate' => 'AA 1 BB']);
    }

    /** Checkout tunai butuh shift kasir terbuka; test yang tidak menguji shift memakai shift ini. */
    protected function ensureCashSession(): CashSession
    {
        return CashSession::where('status', CashSession::OPEN)->first() ?? CashSession::create([
            'user_id' => auth()->id(),
            'opened_at' => now(),
            'opening_float' => 0,
            'book_opening' => 0,
            'from_entry_id' => (int) JournalEntry::max('id'),
            'status' => CashSession::OPEN,
        ]);
    }

    protected function saleOf($response): Sale
    {
        return Sale::findOrFail($response->json('data.id'));
    }
}
