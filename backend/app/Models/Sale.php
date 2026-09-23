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
}
