<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $table = 'suppliers';

    protected $fillable = [
        'supplier_code',
        'supplier_name',
        'phone',
        'email',
        'address',
        'contact_person',
        'payment_terms_days',
        'is_active',
    ];

    protected $casts = [
        'payment_terms_days' => 'integer',
        'is_active' => 'boolean',
    ];
}
