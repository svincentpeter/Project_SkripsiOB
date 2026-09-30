<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Kolom lama booking_id, dp_applied, due_date, edc_bank, edc_type dan surcharge_amount tetap ada di tabel
 * (riwayat), tetapi tidak lagi dibaca atau ditulis: DP booking, BON dan EDC sudah dihapus dari POS.
 */
class Sale extends Model
{
    use HasFactory;

    protected $table = 'sales';

    protected $fillable = [
        'reference',
        'date',
        'customer_name',
        'customer_phone',
        'vehicle_plate',
        'vehicle_model',
        'cashier_name',
        'gross_sales_amount',
        'discount_amount',
        'total_amount',
        'paid_amount',
        'change_amount',
        'payment_method',
        'payment_reference',
        'payment_provider',
        'fee_percentage',
        'fee_amount',
        'net_received',
        'total_hpp',
        'total_profit',
        'notes',
        'status',
        'voided_at',
        'voided_by',
        'void_reason',
        'stock_deducted',
        'branch_id',
    ];

    protected $casts = [
        'date' => 'date',
        'gross_sales_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'voided_at' => 'datetime',
        'fee_percentage' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'net_received' => 'decimal:2',
        'total_hpp' => 'decimal:2',
        'total_profit' => 'decimal:2',
        'stock_deducted' => 'boolean',
        'branch_id' => 'integer',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(SaleDetail::class);
    }

    public function journalEntry(): HasOne
    {
        return $this->hasOne(JournalEntry::class, 'reference_id', 'reference')->where('reference_type', 'POS_SALE');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SalesReturn::class)->orderBy('id');
    }

    /**
     * Satu bentuk nota untuk seluruh respons POS (checkout, riwayat, void).
     */
    public function toReceiptArray(): array
    {
        $this->loadMissing(['details.product', 'payments', 'returns.items']);
        $journal = JournalEntry::with('items.account')
            ->where(fn ($q) => $q->where('reference_id', $this->reference)->whereIn('reference_type', ['POS_SALE', 'POS_SALE_VOID']))
            ->orWhere(fn ($q) => $q->where('reference_type', 'SALES_RETURN')->whereIn('reference_id', $this->returns->pluck('reference')))
            ->orderBy('id')
            ->get();
        $returnedQty = $this->returns->flatMap(fn (SalesReturn $r) => $r->items)
            ->groupBy('sale_detail_id')
            ->map(fn ($rows) => (int) $rows->sum('quantity'));

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'date' => $this->date?->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'vehicle_plate' => $this->vehicle_plate,
            'vehicle_model' => $this->vehicle_model,
            'cashier_name' => $this->cashier_name,
            'gross_sales_amount' => (float) $this->gross_sales_amount,
            'discount_amount' => (float) $this->discount_amount,
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'change_amount' => (float) $this->change_amount,
            'payment_method' => $this->payment_method,
            'payment_provider' => $this->payment_provider,
            'fee_amount' => (float) $this->fee_amount,
            'net_received' => (float) $this->net_received,
            'total_hpp' => (float) $this->total_hpp,
            'total_profit' => (float) $this->total_profit,
            'notes' => $this->notes,
            'status' => $this->status,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'voided_by' => $this->voided_by,
            'void_reason' => $this->void_reason,
            'returned_amount' => round((float) $this->returns->sum('refund_amount'), 2),
            'returns' => $this->returns->map(fn (SalesReturn $r) => $r->toApiArray())->values()->all(),
            'items' => $this->details->map(fn (SaleDetail $d) => [
                'id' => $d->id,
                'item_type' => $d->item_type,
                'item_name' => $d->item_name ?? $d->product?->product_name,
                'product_id' => $d->product_id,
                'service_id' => $d->service_id,
                'is_manual' => $d->is_manual,
                'quantity' => $d->quantity,
                'unit_price' => (float) $d->unit_price,
                'discount_per_item' => $d->quantity > 0 ? round((float) $d->discount_amount / $d->quantity, 2) : 0.0,
                'sub_total' => (float) $d->sub_total,
                'unit_cost_hpp' => (float) $d->unit_cost_hpp,
                'total_cost_hpp' => (float) $d->total_cost_hpp,
                'returned_qty' => (int) ($returnedQty[$d->id] ?? 0),
                'product' => $d->product ? [
                    'id' => $d->product->id,
                    'product_name' => $d->product->product_name,
                    'brand' => $d->product->brand,
                    'product_size' => $d->product->product_size,
                    'motif' => $d->product->motif,
                ] : null,
            ])->values()->all(),
            'payments' => $this->payments->map(fn (SalePayment $p) => [
                'method' => $p->method,
                'account_code' => $p->account_code,
                'amount' => (float) $p->amount,
                'tendered_amount' => (float) $p->tendered_amount,
                'change_amount' => (float) $p->change_amount,
                'fee_percentage' => (float) $p->fee_percentage,
                'fee_amount' => (float) $p->fee_amount,
                'net_received' => (float) $p->net_received,
                'provider_name' => $p->provider_name,
                'reference' => $p->reference,
            ])->values()->all(),
            'journals' => $journal->map(fn (JournalEntry $j) => $j->toApiArray())->values()->all(),
        ];
    }
}
