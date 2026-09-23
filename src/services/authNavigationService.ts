import { ActiveScreen, PermissionKey, RolePermissionsConfig, UserSession } from '../shared/types';
import { DEFAULT_ROLE_PERMISSIONS } from '../shared/data/mockData';

/**
 * Memeriksa apakah suatu layar (ActiveScreen) diizinkan untuk peran pengguna saat ini.
 */
export function isScreenPermittedForRole(
  screen: ActiveScreen,
  role?: string,
  rolePermissions: RolePermissionsConfig = DEFAULT_ROLE_PERMISSIONS
): boolean {
  if (!role) return false;
  if (role === 'OWNER') return true;

  const roleConfig = rolePermissions[role as keyof RolePermissionsConfig];
  if (!roleConfig) return false;

  switch (screen) {
    case 'dashboard':
      return !!roleConfig.dashboard;
    case 'pos':
      return !!roleConfig.pos;
    case 'receipt':
      return !!roleConfig.receipt;
    case 'inventory':
      return !!roleConfig.inventory_view;
    case 'expenses':
      return !!roleConfig.expenses;
    case 'ledger':
      return !!roleConfig.accounting_hub || !!roleConfig.accounts_payable;
    case 'financials':
      return !!roleConfig.financial_reports;
    case 'settings':
      return !!roleConfig.role_settings;
    default:
      return true;
  }
}

/**
 * Menentukan layar default (landing screen) saat pengguna berhasil login berdasarkan perannya.
 */
export function getDefaultScreenForUser(
  role?: string,
  rolePermissions: RolePermissionsConfig = DEFAULT_ROLE_PERMISSIONS
): ActiveScreen {
  if (!role || role === 'OWNER') return 'dashboard';

  // Layar pertama yang diizinkan, mengikuti konfigurasi Owner
  if (isScreenPermittedForRole('pos', role, rolePermissions)) return 'pos';
  if (isScreenPermittedForRole('inventory', role, rolePermissions)) return 'inventory';
  if (isScreenPermittedForRole('dashboard', role, rolePermissions)) return 'dashboard';
  return 'receipt';
}

/**
 * Memeriksa apakah peran pengguna memiliki akses ke area Backoffice (Dashboard, Inventori, Biaya, Buku Besar, dll).
 */
export function canUserAccessBackoffice(
  role?: string,
  rolePermissions: RolePermissionsConfig = DEFAULT_ROLE_PERMISSIONS
): boolean {
  if (!role) return false;
  if (role === 'OWNER') return true;

  return (
    isScreenPermittedForRole('dashboard', role, rolePermissions) ||
    isScreenPermittedForRole('expenses', role, rolePermissions) ||
    isScreenPermittedForRole('ledger', role, rolePermissions) ||
    isScreenPermittedForRole('financials', role, rolePermissions) ||
    isScreenPermittedForRole('settings', role, rolePermissions)
  );
}

/**
 * Memeriksa satu kunci izin untuk pengguna yang sedang login (Owner selalu diizinkan).
 */
export function hasPermission(
  user: UserSession | null | undefined,
  rolePermissions: RolePermissionsConfig,
  key: PermissionKey
): boolean {
  if (!user) return false;
  if (user.role === 'OWNER') return true;
  const roleConfig = rolePermissions[user.role as keyof RolePermissionsConfig];
  return !!roleConfig?.[key];
}
