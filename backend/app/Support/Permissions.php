<?php

namespace App\Support;

/**
 * Daftar peran & kunci izin — harus sama dengan PermissionKey di frontend.
 */
final class Permissions
{
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
        'cash_session', 'cash_session_approve', 'cash_movement',
        'sales_return', 'purchase_return',
        'fixed_assets', 'bank_reconciliation',
    ];

    public const ROLES = ['OWNER', 'KASIR', 'GUDANG'];

    public const CONFIGURABLE_ROLES = ['KASIR', 'GUDANG'];

    public const DEFAULTS = [
        'KASIR' => ['pos', 'receipt', 'cash_session', 'sales_return'],
        'GUDANG' => ['inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname', 'purchase_return'],
    ];
}
