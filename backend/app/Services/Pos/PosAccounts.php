<?php

namespace App\Services\Pos;

/**
 * Kode akun COA SAK EMKM yang dipakai siklus POS.
 */
final class PosAccounts
{
    public const CASH = '1-1000';
    public const BANK = '1-1001';
    public const INVENTORY = '1-2000';
    public const REVENUE_GOODS = '4-1000';
    public const REVENUE_SERVICE = '4-1001';
    public const SALES_DISCOUNT = '4-9000';
    public const COGS = '5-1000';
    public const MDR_EXPENSE = '6-1009';

    /** Setiap nota lunas saat checkout: tidak ada BON, DP booking, atau EDC. */
    public const CHECKOUT_METHODS = ['TUNAI', 'TRANSFER', 'TRANSFER_BCA', 'QRIS'];

    public static function forMethod(string $method): string
    {
        return $method === 'TUNAI' ? self::CASH : self::BANK;
    }
}
