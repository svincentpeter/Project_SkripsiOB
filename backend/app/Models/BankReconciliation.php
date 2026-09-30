<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Saldo akhir rekening koran satu bulan (diisi pengguna); status rekonsiliasi dihitung ulang setiap laporan.
 */
class BankReconciliation extends Model
{
    protected $fillable = ['period', 'statement_ending_balance', 'updated_by', 'branch_id'];

    protected $casts = ['statement_ending_balance' => 'decimal:2'];
}
