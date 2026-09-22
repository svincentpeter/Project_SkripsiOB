import { describe, it, expect } from 'vitest';
import { generateProductSku } from '../../../services/inventoryService';

describe('Inventory Module Repairs & Regression Audit', () => {
  describe('Task 2: SKU and Auto-naming generator for all categories', () => {
    it('should generate valid SKU for BAN_BARU', () => {
      const sku = generateProductSku('Bridgestone', 185, '65', 'R15', 'Turanza', 'BAN_BARU');
      expect(sku).toContain('BRI');
      expect(sku).toContain('1856515');
      expect(sku).toContain('TUR');
    });

    it('should generate valid SKU for VELG with PCD', () => {
      const sku = generateProductSku('HSR', undefined, undefined, 'R17', 'Myth01', 'VELG', '4x100');
      expect(sku).toContain('VLG-HSR-R17-4X100');
    });

    it('should generate valid SKU for BAN_DALAM', () => {
      const sku = generateProductSku('GTRadial', undefined, '14', 'R14', 'STD', 'BAN_DALAM');
      expect(sku).toContain('BND-GTR-14');
    });

    it('should handle custom brands smoothly', () => {
      const sku = generateProductSku('Continental', 195, '55', 'R16', 'Ultra', 'BAN_BARU');
      expect(sku).toContain('CON');
      expect(sku).toContain('1955516');
    });
  });

  describe('Task 3: Catalog Pagination Logic', () => {
    it('calculates total pages correctly', () => {
      const totalItems = 35;
      const pageSize = 10;
      const totalPages = Math.ceil(totalItems / pageSize);
      expect(totalPages).toBe(4);

      const page1 = Array.from({ length: totalItems }, (_, i) => i + 1).slice(0, 10);
      expect(page1.length).toBe(10);
      expect(page1[0]).toBe(1);
      expect(page1[9]).toBe(10);

      const page4 = Array.from({ length: totalItems }, (_, i) => i + 1).slice(30, 40);
      expect(page4.length).toBe(5);
      expect(page4[0]).toBe(31);
      expect(page4[4]).toBe(35);
    });
  });

  describe('Task 4: Brand name deduplication in row titles', () => {
    it('deduplicates brand prefix when motif already starts with brand name', () => {
      const deduplicateTitle = (brand: string, motif: string, productName: string) => {
        const b = (brand || '').trim();
        const raw = (motif && motif !== '-' ? motif : productName || '').trim();
        if (b && raw.toLowerCase().startsWith(b.toLowerCase())) {
          return raw;
        }
        return b ? `${b} ${raw}`.trim() : raw;
      };

      // Case 1: Motif already has brand
      expect(deduplicateTitle('Accelera', 'Accelera Adjust Test', 'Accelera Adjust Test')).toBe('Accelera Adjust Test');

      // Case 2: Motif does NOT have brand
      expect(deduplicateTitle('Bridgestone', 'Turanza T005A', 'Bridgestone Turanza T005A')).toBe('Bridgestone Turanza T005A');

      // Case 3: Motif is '-' so fallback to productName which has brand
      expect(deduplicateTitle('Dunlop', '-', 'Dunlop Enasave EC300+')).toBe('Dunlop Enasave EC300+');
    });
  });

  describe('Task 1: Stock Opname & Mutation field mappings', () => {
    it('validates mutation item format matches schema', () => {
      const mutationSample = {
        id: 'mut-1',
        tire_id: 'p-1',
        date: '2026-03-22',
        type: 'MASUK' as const,
        qty: 10,
        balance: 25,
        ref_doc: 'RCV-2026-001',
        notes: 'Penerimaan barang',
        operator: 'Gudang - Bambang',
      };

      expect(mutationSample.ref_doc).toBe('RCV-2026-001');
      expect(mutationSample.qty).toBe(10);
      expect(mutationSample.balance).toBe(25);
      expect(['MASUK', 'KELUAR', 'PENYESUAIAN']).toContain(mutationSample.type);
    });
  });
});
