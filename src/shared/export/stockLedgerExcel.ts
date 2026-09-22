import ExcelJS from 'exceljs';
import { StockMonthlyReportData } from '../../services/stockMonthlyLedgerService';

/**
 * Generate and download an Excel (.xlsx) file matching the exact spreadsheet layout of ProjectOmahBan.
 */
export async function exportStockLedgerToExcel(
  data: StockMonthlyReportData,
  filename: string = 'Laporan_Stok_FIFO'
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Omah Ban POS & SIA SAK EMKM';
  wb.created = new Date();

  const ws = wb.addWorksheet('Buku Stok Bulanan', {
    views: [{ state: 'frozen', xSplit: 6, ySplit: 2 }],
  });

  const daysInMonth = data.meta.days_in_month || 30;

  // Title Row
  const totalCols = 9 + daysInMonth + 1;
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = `LAPORAN STOK BULANAN & BUKU FIFO GUDANG - PERIODE ${data.meta.month}`;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  titleRow.height = 28;
  ws.mergeCells(1, 1, 1, totalCols);

  // Headers
  const headerRow = ws.getRow(2);
  headerRow.height = 24;

  const headerConfigs: Array<{ label: string; width: number; bg: string; fg?: string; align?: 'left' | 'right' | 'center' }> = [
    { label: 'No', width: 6, bg: 'FFE2E8F0', align: 'center' },
    { label: 'Merk & Nama Ban', width: 32, bg: 'FFFEF9C3', align: 'left' },
    { label: 'Ukuran', width: 12, bg: 'FFE2E8F0', align: 'center' },
    { label: 'Ring', width: 8, bg: 'FFDCFCE7', align: 'center' },
    { label: 'Modal (HPP)', width: 14, bg: 'FFFFEDD5', align: 'right' },
    { label: 'Harga Jual', width: 14, bg: 'FFDBEAFE', align: 'right' },
    { label: 'Awal', width: 9, bg: 'FFF3E8FF', align: 'center' },
    { label: 'Masuk', width: 9, bg: 'FFF3E8FF', align: 'center' },
    { label: 'Sisa', width: 9, bg: 'FFF3E8FF', align: 'center' },
  ];

  for (let d = 1; d <= daysInMonth; d++) {
    headerConfigs.push({
      label: String(d),
      width: 5,
      bg: 'FFF8FAFC',
      align: 'center',
    });
  }

  headerConfigs.push({
    label: 'Total',
    width: 10,
    bg: 'FFBBF7D0',
    align: 'center',
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  headerConfigs.forEach((cfg, idx) => {
    const colIdx = idx + 1;
    const cell = headerRow.getCell(colIdx);
    cell.value = cfg.label;
    cell.font = { bold: true, size: 10, color: { argb: cfg.fg || 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cfg.bg } };
    cell.alignment = { horizontal: cfg.align || 'left', vertical: 'middle' };
    cell.border = thinBorder;
    ws.getColumn(colIdx).width = cfg.width;
  });

  let currentRowIdx = 3;

  data.rows.forEach((row, rIdx) => {
    const r = ws.getRow(currentRowIdx++);
    r.height = 20;

    const brandDisplay = `${row.brand_name} ${row.motif !== '-' ? row.motif : row.product_name}`;

    r.getCell(1).value = rIdx + 1;
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(1).font = { bold: true };
    r.getCell(1).border = thinBorder;

    r.getCell(2).value = row.is_old_stock && row.reference_price
      ? `${brandDisplay} (@${row.reference_price})`
      : brandDisplay;
    if (row.is_old_stock) {
      r.getCell(2).font = { color: { argb: 'FFE11D48' }, bold: true };
    }
    r.getCell(2).border = thinBorder;

    r.getCell(3).value = row.product_size;
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(3).border = thinBorder;

    r.getCell(4).value = row.ring ? `R${String(row.ring).replace(/\D/g, '')}` : '-';
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(4).border = thinBorder;

    r.getCell(5).value = row.product_cost;
    r.getCell(5).numFmt = '#,##0';
    r.getCell(5).alignment = { horizontal: 'right' };
    r.getCell(5).font = { bold: true };
    r.getCell(5).border = thinBorder;

    r.getCell(6).value = row.product_price;
    r.getCell(6).numFmt = '#,##0';
    r.getCell(6).alignment = { horizontal: 'right' };
    r.getCell(6).border = thinBorder;

    r.getCell(7).value = row.opening;
    r.getCell(7).alignment = { horizontal: 'center' };
    r.getCell(7).border = thinBorder;

    r.getCell(8).value = row.restock;
    r.getCell(8).alignment = { horizontal: 'center' };
    r.getCell(8).border = thinBorder;

    r.getCell(9).value = row.remaining;
    r.getCell(9).alignment = { horizontal: 'center' };
    r.getCell(9).font = {
      bold: true,
      color: {
        argb: row.remaining <= 0 ? 'FFE11D48' : row.remaining <= 2 ? 'FFD97706' : 'FF16A34A',
      },
    };
    r.getCell(9).border = thinBorder;

    // Daily columns
    for (let d = 1; d <= daysInMonth; d++) {
      const colIdx = 9 + d;
      const cell = r.getCell(colIdx);
      const q = row.daily_sales[d] || 0;
      cell.value = q > 0 ? q : '';
      cell.alignment = { horizontal: 'center' };
      cell.border = thinBorder;
      if (q > 0) {
        cell.font = { bold: true, color: { argb: 'FF065F46' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      }
    }

    // Total column
    const totalCell = r.getCell(9 + daysInMonth + 1);
    totalCell.value = row.sold;
    totalCell.alignment = { horizontal: 'center' };
    totalCell.font = { bold: true };
    totalCell.border = thinBorder;
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };

    // Sub-rows for multiple layers
    if (row.layers && row.layers.length > 1) {
      row.layers.slice(1).forEach((layer, lIdx) => {
        const lr = ws.getRow(currentRowIdx++);
        lr.height = 18;

        lr.getCell(1).value = '';
        lr.getCell(1).border = thinBorder;

        lr.getCell(2).value = `   ↳ Lapisan Batch #${lIdx + 2}`;
        lr.getCell(2).font = { italic: true, color: { argb: 'FF64748B' } };
        lr.getCell(2).border = thinBorder;

        lr.getCell(3).value = '';
        lr.getCell(3).border = thinBorder;
        lr.getCell(4).value = '';
        lr.getCell(4).border = thinBorder;

        lr.getCell(5).value = layer.batch_cost;
        lr.getCell(5).numFmt = '#,##0';
        lr.getCell(5).alignment = { horizontal: 'right' };
        lr.getCell(5).font = { bold: true, color: { argb: 'FF312E81' } };
        lr.getCell(5).border = thinBorder;

        lr.getCell(6).value = '';
        lr.getCell(6).border = thinBorder;

        lr.getCell(7).value = layer.initial_qty;
        lr.getCell(7).alignment = { horizontal: 'center' };
        lr.getCell(7).border = thinBorder;

        lr.getCell(8).value = '-';
        lr.getCell(8).alignment = { horizontal: 'center' };
        lr.getCell(8).border = thinBorder;

        lr.getCell(9).value = layer.remaining_qty;
        lr.getCell(9).alignment = { horizontal: 'center' };
        lr.getCell(9).font = {
          bold: true,
          color: {
            argb: layer.remaining_qty <= 0 ? 'FFE11D48' : layer.remaining_qty <= 2 ? 'FFD97706' : 'FF16A34A',
          },
        };
        lr.getCell(9).border = thinBorder;

        for (let d = 1; d <= daysInMonth; d++) {
          const colIdx = 9 + d;
          const cell = lr.getCell(colIdx);
          const q = layer.daily_sales[d] || 0;
          cell.value = q > 0 ? q : '';
          cell.alignment = { horizontal: 'center' };
          cell.border = thinBorder;
          if (q > 0) {
            cell.font = { bold: true, color: { argb: 'FF065F46' } };
          }
        }

        const lTotalCell = lr.getCell(9 + daysInMonth + 1);
        lTotalCell.value = layer.sold;
        lTotalCell.alignment = { horizontal: 'center' };
        lTotalCell.font = { bold: true };
        lTotalCell.border = thinBorder;
      });
    }
  });

  // Footer Total Row
  const footerRow = ws.getRow(currentRowIdx++);
  footerRow.height = 24;
  footerRow.getCell(2).value = 'TOTAL KESELURUHAN';
  footerRow.getCell(2).font = { bold: true };
  footerRow.getCell(7).value = data.summary.total_opening;
  footerRow.getCell(7).alignment = { horizontal: 'center' };
  footerRow.getCell(7).font = { bold: true };
  footerRow.getCell(8).value = data.summary.total_restock;
  footerRow.getCell(8).alignment = { horizontal: 'center' };
  footerRow.getCell(8).font = { bold: true };
  footerRow.getCell(9).value = data.summary.total_remaining;
  footerRow.getCell(9).alignment = { horizontal: 'center' };
  footerRow.getCell(9).font = { bold: true };

  const footerTotalSold = footerRow.getCell(9 + daysInMonth + 1);
  footerTotalSold.value = data.summary.total_sold;
  footerTotalSold.alignment = { horizontal: 'center' };
  footerTotalSold.font = { bold: true };

  for (let c = 1; c <= totalCols; c++) {
    const cell = footerRow.getCell(c);
    cell.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }

  // Trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
