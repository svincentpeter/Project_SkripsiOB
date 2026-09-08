import ExcelJS from 'exceljs';
import { Document } from 'docx';
import { describe, expect, it } from 'vitest';

describe('deps', () => {
  it('exceljs + docx terimpor', () => {
    expect(new ExcelJS.Workbook().addWorksheet('Laporan').name).toBe('Laporan');
    expect(new Document({ sections: [] })).toBeTruthy();
  });
});
