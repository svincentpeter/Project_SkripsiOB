<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends Model
{
    use HasFactory, SoftDeletes;

    public const GLOBAL_MIN_MARKUP_PERCENT = 15.0;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'is_partner',
        'min_markup_percent',
        'default_markup_percent',
    ];

    protected $casts = [
        'is_partner' => 'boolean',
        'min_markup_percent' => 'decimal:2',
        'default_markup_percent' => 'decimal:2',
    ];

    public function aliases(): HasMany
    {
        return $this->hasMany(BrandAlias::class, 'brand_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'brand_id');
    }
}
