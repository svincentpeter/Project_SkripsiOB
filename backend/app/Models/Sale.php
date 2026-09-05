<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
        'vehicle_plate',
        'cashier_name',
        'gross_sales_amount',
        'discount_amount',
        'tax_percentage',
        'tax_amount',
        'total_amount',
        'paid_amount',
        'payment_method',
        'payment_reference',
        'total_hpp',
        'total_profit',
        'notes',
        'status',
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
        return $this->hasOne(JournalEntry::class, 'reference_id', 'reference');
    }
}
