export type CellValue = string | number | null;
export type ColType = 'text' | 'number' | 'currency' | 'date' | 'percent';
export type ExportFormat = 'xlsx' | 'pdf' | 'docx' | 'csv';

export interface ExportColumn {
  key: string;
  label: string;
  type: ColType;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export interface ExportSection {
  title?: string;
  columns: ExportColumn[];
  rows: Array<Record<string, CellValue>>;
  totals?: Partial<Record<string, CellValue>>;
}

export interface ExportKop {
  storeName: string;
  branchName: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  reportTitle: string;
  periodLabel: string;
  generatedBy: string;
  generatedAt: string;
}

export interface ExportDoc {
  reportId: string;
  title: string;
  orientation: 'portrait' | 'landscape';
  kop: ExportKop;
  sections: ExportSection[];
}

export interface ExportCtx {
  periodLabel: string;
  startDate?: string;
  endDate?: string;
}
