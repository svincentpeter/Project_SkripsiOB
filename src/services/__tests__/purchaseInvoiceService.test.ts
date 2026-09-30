import { describe, it, expect } from 'vitest';
import {
  costFromInvoice,
  costDelta,
  invoicePriceFromCost,
  invoiceSummary,
  lastBatchCost,
  parseInvoicePrice,
  roundInvoicePrice,
} from '../purchaseInvoiceService';
import { ProductBatch } from '../../shared/types';

const batch = (id: string, purchase_date: string, batch_cost: number): ProductBatch => ({
  id,
  product_id: 'p1',
  batch_code: `B-${id}`,
  source_name: 'Supplier',
  batch_cost,
  initial_qty: 4,
  remaining_qty: 4,
  purchase_date,
});

describe('costFromInvoice', () => {
  it('menambah PPN 11% bila faktur belum termasuk PPN, dibulatkan ke rupiah', () => {
    expect(costFromInvoice(1000000, 'exclude')).toBe(1110000);
    expect(costFromInvoice(677873.75, 'exclude')).toBe(752440);
  });

  it('memakai harga faktur apa adanya bila sudah termasuk PPN', () => {
    expect(costFromInvoice(1110000, 'include')).toBe(1110000);
    expect(costFromInvoice(752439.5, 'include')).toBe(752440);
  });

  it('menganggap harga kosong atau minus sebagai nol', () => {
    expect(costFromInvoice(-5, 'exclude')).toBe(0);
    expect(costFromInvoice(Number.NaN, 'include')).toBe(0);
  });
});

describe('invoicePriceFromCost', () => {
  it('membalik modal ke harga sebelum PPN sehingga modal yang sama dihasilkan kembali', () => {
    const price = invoicePriceFromCost(1110000, 'exclude');
    expect(price).toBe(1000000);
    expect(costFromInvoice(price, 'exclude')).toBe(1110000);
    expect(costFromInvoice(invoicePriceFromCost(752440, 'exclude'), 'exclude')).toBe(752440);
  });

  it('mengembalikan modal apa adanya pada mode sudah PPN', () => {
    expect(invoicePriceFromCost(752440, 'include')).toBe(752440);
  });
});

describe('invoiceSummary', () => {
  it('menghitung DPP, PPN dari total DPP, dan total faktur untuk mode belum PPN', () => {
    expect(invoiceSummary(4, 677873.75, 'exclude')).toEqual({
      mode: 'exclude',
      dpp: 2711495,
      ppn: 298264,
      total: 3009759,
      modal: 3009760,
    });
  });

  it('memisahkan DPP dan PPN dari total bila faktur sudah termasuk PPN', () => {
    expect(invoiceSummary(2, 1110000, 'include')).toEqual({
      mode: 'include',
      dpp: 2000000,
      ppn: 220000,
      total: 2220000,
      modal: 2220000,
    });
  });
});

describe('lastBatchCost', () => {
  it('mengambil modal batch dengan tanggal masuk terbaru', () => {
    const batches = [batch('1', '2026-08-01', 700000), batch('3', '2026-09-10', 760000), batch('2', '2026-09-01', 740000)];
    expect(lastBatchCost({ batches, product_cost: 1 })).toBe(760000);
  });

  it('memakai id terbesar bila tanggal sama', () => {
    const batches = [batch('7', '2026-09-10', 760000), batch('12', '2026-09-10', 765000)];
    expect(lastBatchCost({ batches, product_cost: 1 })).toBe(765000);
  });

  it('jatuh ke product_cost bila tidak ada batch aktif', () => {
    expect(lastBatchCost({ batches: [], product_cost: 725000 })).toBe(725000);
    expect(lastBatchCost({ product_cost: 0 })).toBe(0);
  });
});

describe('costDelta', () => {
  it('memberi selisih rupiah dan persen terhadap modal lama', () => {
    expect(costDelta(1110000, 1000000)).toEqual({ diff: 110000, percent: 11 });
    expect(costDelta(950000, 1000000)).toEqual({ diff: -50000, percent: -5 });
  });

  it('null bila belum ada modal pembanding', () => {
    expect(costDelta(1000000, 0)).toBeNull();
  });
});

describe('parseInvoicePrice / roundInvoicePrice', () => {
  it('membaca format rupiah Indonesia dengan desimal koma', () => {
    expect(parseInvoicePrice('677.873,75')).toBe(677873.75);
    expect(parseInvoicePrice('Rp 1.250.000')).toBe(1250000);
    expect(parseInvoicePrice('1250000')).toBe(1250000);
    expect(parseInvoicePrice('12,5')).toBe(12.5);
    expect(parseInvoicePrice('')).toBe(0);
  });

  it('membulatkan harga faktur ke 2 desimal', () => {
    expect(roundInvoicePrice(677873.756)).toBe(677873.76);
    expect(parseInvoicePrice('1.000,999')).toBe(1001);
  });
});
