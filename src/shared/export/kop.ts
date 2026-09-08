import { getExportConfig } from './exportConfig';
import type { ExportKop } from './types';

export const formatStamp = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

export const buildKop = (reportTitle: string, periodLabel: string): ExportKop => {
  const { settings, user } = getExportConfig();
  return {
    storeName: settings?.store_name || 'Omah Ban',
    branchName: settings?.branch_name || 'Cabang 3',
    address: settings?.address || '',
    city: settings?.city || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
    reportTitle: reportTitle.toUpperCase(),
    periodLabel,
    generatedBy: user ? `${user.name} (${user.role})` : 'Sistem',
    generatedAt: new Date().toISOString(),
  };
};
