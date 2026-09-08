import { formatDateIndo, formatRupiah } from '../../utils/formatters';
import type { CellValue, ColType } from '../types';

export const toNumber = (v: CellValue): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const displayCell = (v: CellValue, type: ColType): string => {
  if (v === null || v === '') return '';
  switch (type) {
    case 'currency':
      return formatRupiah(toNumber(v));
    case 'percent':
      return `${v}%`;
    case 'date':
      return formatDateIndo(String(v));
    case 'number':
      return String(toNumber(v));
    default:
      return String(v);
  }
};
