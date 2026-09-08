import type { ExportDoc } from '../types';

export const fixtureDoc: ExportDoc = {
  reportId: 'journal',
  title: 'Jurnal Umum',
  orientation: 'landscape',
  kop: {
    storeName: 'Omah Ban', branchName: 'Cabang 3', address: 'Jl. Raya Magelang', city: 'Magelang',
    phone: '(0293) 314-889', email: 'info@omahban.co.id', reportTitle: 'JURNAL UMUM',
    periodLabel: '01 Sep 2026 - 08 Sep 2026', generatedBy: 'Catherine (OWNER)', generatedAt: '2026-09-08T10:00:00Z',
  },
  sections: [
    {
      columns: [
        { key: 'tgl', label: 'Tanggal', type: 'date' },
        { key: 'ket', label: 'Keterangan', type: 'text' },
        { key: 'deb', label: 'Debit', type: 'currency' },
      ],
      rows: [
        { tgl: '2026-09-01', ket: 'Bayar "gaji", lembur', deb: 1500000 },
        { tgl: '2026-09-02', ket: 'Kosong', deb: null },
      ],
      totals: { deb: 1500000 },
    },
  ],
};

export const twoSectionDoc: ExportDoc = {
  ...fixtureDoc,
  reportId: 'fin_balance_sheet',
  title: 'Neraca',
  orientation: 'portrait',
  sections: [
    {
      title: 'Aset Lancar',
      columns: [
        { key: 'label', label: 'Komponen', type: 'text' },
        { key: 'value', label: 'Nominal', type: 'currency' },
      ],
      rows: [{ label: 'Kas Laci', value: 100 }, { label: 'Bank BCA', value: 200 }],
      totals: { value: 300 },
    },
    {
      title: 'Liabilitas',
      columns: [
        { key: 'label', label: 'Komponen', type: 'text' },
        { key: 'value', label: 'Nominal', type: 'currency' },
      ],
      rows: [{ label: 'Hutang Dagang', value: 50 }],
      totals: { value: 50 },
    },
  ],
};
