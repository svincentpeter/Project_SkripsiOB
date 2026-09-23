<?php

namespace App\Support;

/**
 * Daftar peran & kunci izin — harus sama dengan PermissionKey di frontend.
 */
final class Permissions
{
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void', 'booking_dp', 'bon_receivable',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
    ];

    public const ROLES = ['OWNER', 'KASIR', 'GUDANG'];

    public const CONFIGURABLE_ROLES = ['KASIR', 'GUDANG'];

    public const DEFAULTS = [
        'KASIR' => ['pos', 'receipt', 'booking_dp', 'bon_receivable'],
        'GUDANG' => ['inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname'],
    ];
}
