<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        'tax_percentage',
        'tax_amount',
        'total_amount',
        'paid_amount',
        'change_amount',
        'dp_applied',
        'booking_id',
        'payment_method',
        'payment_reference',
        'payment_provider',
        'edc_bank',
        'edc_type',
        'fee_percentage',
        'fee_amount',
        'surcharge_amount',
        'net_received',
        'total_hpp',
        'total_profit',
        'notes',
        'status',
        'due_date',
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
        'tax_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'dp_applied' => 'decimal:2',
        'due_date' => 'date',
        'voided_at' => 'datetime',
        'fee_percentage' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'surcharge_amount' => 'decimal:2',
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

    public function receivablePayments(): HasMany
    {
        return $this->hasMany(ReceivablePayment::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(SalesBooking::class, 'booking_id');
    }

    /**
     * Satu bentuk nota untuk seluruh respons POS (checkout, riwayat, void, piutang).
     */
    public function toReceiptArray(): array
    {
        $this->loadMissing(['details.product', 'payments', 'receivablePayments']);
        $journal = JournalEntry::with('items.account')
            ->where('reference_id', $this->reference)
            ->whereIn('reference_type', ['POS_SALE', 'POS_SALE_VOID'])
            ->orderBy('id')
            ->get();

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
            'tax_percentage' => (float) $this->tax_percentage,
            'tax_amount' => (float) $this->tax_amount,
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'change_amount' => (float) $this->change_amount,
            'dp_applied' => (float) $this->dp_applied,
            'booking_id' => $this->booking_id,
            'payment_method' => $this->payment_method,
            'payment_provider' => $this->payment_provider,
            'edc_bank' => $this->edc_bank,
            'edc_type' => $this->edc_type,
            'fee_amount' => (float) $this->fee_amount,
            'surcharge_amount' => (float) $this->surcharge_amount,
            'net_received' => (float) $this->net_received,
            'total_hpp' => (float) $this->total_hpp,
            'total_profit' => (float) $this->total_profit,
            'notes' => $this->notes,
            'status' => $this->status,
            'due_date' => $this->due_date?->toDateString(),
            'receivable_paid' => (float) $this->receivablePayments->sum('amount'),
            'voided_at' => $this->voided_at?->toIso8601String(),
            'voided_by' => $this->voided_by,
            'void_reason' => $this->void_reason,
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
                'surcharge_amount' => (float) $p->surcharge_amount,
                'net_received' => (float) $p->net_received,
                'provider_name' => $p->provider_name,
                'edc_bank' => $p->edc_bank,
                'edc_type' => $p->edc_type,
                'reference' => $p->reference,
            ])->values()->all(),
            'journals' => $journal->map(fn (JournalEntry $j) => $j->toApiArray())->values()->all(),
        ];
    }
}
