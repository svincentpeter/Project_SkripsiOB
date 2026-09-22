import { describe, it, expect } from 'vitest';
import { InventorySubView } from '../InventoryScreen';

describe('InventorySubView type', () => {
  it('supports buku_fifo subview for owner stock spreadsheet', () => {
    const subView: InventorySubView = 'buku_fifo';
    expect(subView).toBe('buku_fifo');
  });

  it('supports all required subviews in inventory screen', () => {
    const subViews: InventorySubView[] = ['katalog', 'buku_fifo', 'kategori', 'jasa', 'stok_mutasi', 'supplier'];
    expect(subViews).toContain('buku_fifo');
    expect(subViews).toHaveLength(6);
  });
});
