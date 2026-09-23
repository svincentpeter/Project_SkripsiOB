<?php

namespace App\Services\Pos;

/**
 * Kode akun COA SAK EMKM yang dipakai siklus POS.
 */
final class PosAccounts
{
    public const CASH = '1-1000';
    public const BANK = '1-1001';
    public const RECEIVABLE = '1-1002';
    public const INVENTORY = '1-2000';
    public const VAT_OUT = '2-1003';
    public const CUSTOMER_DEPOSIT = '2-1004';
    public const REVENUE_GOODS = '4-1000';
    public const REVENUE_SERVICE = '4-1001';
    public const SURCHARGE = '4-2000';
    public const SALES_DISCOUNT = '4-9000';
    public const COGS = '5-1000';
    public const MDR_EXPENSE = '6-1009';

    public const CHECKOUT_METHODS = ['TUNAI', 'TRANSFER', 'TRANSFER_BCA', 'QRIS', 'EDC_DEBIT', 'EDC_CREDIT'];

    public const DEPOSIT_METHODS = ['TUNAI', 'TRANSFER', 'TRANSFER_BCA', 'QRIS'];

    public static function forMethod(string $method): string
    {
        return $method === 'TUNAI' ? self::CASH : self::BANK;
    }
}
