<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu aset tetap. Penyusutan garis lurus per bulan penuh mulai `depreciation_start` (YYYY-MM) atas dasar
 * biaya − residu − akumulasi penyusutan sebelum masuk sistem, dihitung kumulatif dalam sen agar
 * bulan terakhir menyerap pembulatan.
 */
class FixedAsset extends Model
{
    public const CATEGORIES = [
        'PERALATAN_BENGKEL' => 'Peralatan & Mesin Bengkel',
        'INVENTARIS_TOKO' => 'Inventaris & Perabot Toko',
        'KENDARAAN' => 'Kendaraan',
    ];

    public const FUNDING = ['TUNAI', 'TRANSFER', 'OPENING', 'MODAL'];

    /** Sumber dana yang membawa bulan mulai penyusutan & akumulasi awal sendiri (aset tidak dibeli sekarang). */
    public const CARRIED_OVER = ['OPENING', 'MODAL'];

    protected $fillable = [
        'code', 'name', 'category', 'acquisition_date', 'acquisition_cost', 'residual_value', 'useful_life_months',
        'depreciation_start', 'opening_accumulated_depreciation', 'funding', 'journal_entry_number', 'status', 'notes',
        'void_reason', 'voided_by', 'voided_at', 'created_by', 'branch_id',
    ];

    protected $casts = [
        'acquisition_date' => 'date',
        'acquisition_cost' => 'decimal:2',
        'residual_value' => 'decimal:2',
        'opening_accumulated_depreciation' => 'decimal:2',
        'useful_life_months' => 'integer',
        'voided_at' => 'datetime',
    ];

    public function depreciations(): HasMany
    {
        return $this->hasMany(FixedAssetDepreciation::class);
    }

    public static function cents(mixed $amount): int
    {
        return (int) round((float) $amount * 100);
    }

    /** Jumlah bulan dari $start sampai $period, keduanya termasuk (0 atau negatif bila $period sebelum $start). */
    public static function monthsBetween(string $start, string $period): int
    {
        [$startYear, $startMonth] = array_map('intval', explode('-', $start));
        [$year, $month] = array_map('intval', explode('-', $period));

        return ($year - $startYear) * 12 + ($month - $startMonth) + 1;
    }

    /** Nilai yang disusutkan sistem (sen): biaya − residu − akumulasi sebelum mulai disusutkan. */
    public function baseCents(): int
    {
        return self::cents($this->acquisition_cost) - self::cents($this->residual_value) - self::cents($this->opening_accumulated_depreciation);
    }

    /** Penyusutan kumulatif yang seharusnya sudah dibukukan sistem sampai akhir $period (sen). */
    public function expectedCentsThrough(string $period): int
    {
        $months = self::monthsBetween($this->depreciation_start, $period);
        if ($months <= 0) {
            return 0;
        }

        return $months >= $this->useful_life_months
            ? $this->baseCents()
            : intdiv($this->baseCents() * $months, $this->useful_life_months);
    }

    /**
     * Akumulasi penyusutan: saldo awal + seluruh penyusutan yang dibukukan sistem. Aset VOID: penyusutan sistemnya
     * sudah dibalik saat dibatalkan, jadi tinggal saldo awalnya (sama dengan catatan aset tetap CALK).
     */
    public function accumulatedDepreciation(): float
    {
        if ($this->status === 'VOID') {
            return round((float) $this->opening_accumulated_depreciation, 2);
        }
        if (! array_key_exists('depreciations_sum_amount', $this->getAttributes())) {
            $this->loadSum('depreciations', 'amount');
        }

        return round((float) $this->opening_accumulated_depreciation + (float) $this->depreciations_sum_amount, 2);
    }

    public function toApiArray(): array
    {
        if (! array_key_exists('depreciations_max_period', $this->getAttributes())) {
            $this->loadMax('depreciations', 'period');
        }
        $accumulated = $this->accumulatedDepreciation();

        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'category' => $this->category,
            'category_label' => self::CATEGORIES[$this->category] ?? $this->category,
            'acquisition_date' => $this->acquisition_date->toDateString(),
            'acquisition_cost' => (float) $this->acquisition_cost,
            'residual_value' => (float) $this->residual_value,
            'useful_life_months' => $this->useful_life_months,
            'depreciation_start' => $this->depreciation_start,
            'opening_accumulated_depreciation' => (float) $this->opening_accumulated_depreciation,
            'monthly_depreciation' => round(intdiv($this->baseCents(), max(1, $this->useful_life_months)) / 100, 2),
            'accumulated_depreciation' => $accumulated,
            'book_value' => round((float) $this->acquisition_cost - $accumulated, 2),
            'last_depreciated_period' => $this->depreciations_max_period,
            'funding' => $this->funding,
            'journal_entry_number' => $this->journal_entry_number,
            'status' => $this->status,
            'notes' => $this->notes,
            'void_reason' => $this->void_reason,
        ];
    }
}
