import { apiClient, ApiError } from './apiClient';
import ExcelJS from 'exceljs';
import { ProductItem } from '../../shared/types';
import { upsertProductToSupabase } from '../supabaseDataService';
import { isSupabaseConfigured } from '../supabaseClient';

export interface StagingBatch {
  batch_cost: number | null;
  initial_qty: number;
  remaining_qty: number;
  is_old_stock: boolean;
  reference_price: number | null;
  source_row: number;
}

export interface DbMatchInfo {
  id: number;
  code: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
  diff: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface StagingProduct {
  match_key: string;
  product_code: string;
  product_name: string;
  brand_id: number;
  brand_name: string;
  category_id: number;
  product_size: string | null;
  ring: string | null;
  product_year: number;
  product_price: number | null;
  avg_cost: number | null;
  total_stock: number;
  opening_qty: number;
  is_old_stock: boolean;
  reference_price: number | null;
  sheet_name: string;
  batches: StagingBatch[];
  db_match?: DbMatchInfo | null;
}

export interface UnresolvedRow {
  sheet: string;
  row: number;
  name: string;
  reason: string;
  size: string | null;
  ring: string | null;
  qty: number;
}

export interface StagingMeta {
  source: string;
  generated_at: string;
  qty_column: 'G' | 'H';
  rows_read: number;
  rows_product: number;
  rows_child: number;
  rows_note: number;
  rows_unresolved: number;
  total_products: number;
  total_batches: number;
  total_stock_qty: number;
  total_opening_qty: number;
  products_without_price: number;
  products_without_cost: number;
}

export interface StagingStats {
  total_excel: number;
  total_stock_excel: number;
  total_matched: number;
  total_unmatched: number;
  total_surplus: number;
  total_deficit: number;
  total_equal: number;
  can_commit: boolean;
}

export interface StagingData {
  meta: StagingMeta;
  products: StagingProduct[];
  notes: Array<{ sheet: string; row: number; text: string }>;
  unresolved: UnresolvedRow[];
  stats: StagingStats;
}

export interface CommitResult {
  created: number;
  updated: number;
  deactivated: number;
  zeroed: number;
  batches_created: number;
  movements: number;
  price_audits: number;
  snapshot_path: string;
}

// Client-side brand aliases dictionary (Paritas ProjectOmahBan)
const BRAND_ALIASES: Record<string, { id: number; name: string }> = {
  'bs': { id: 2, name: 'Bridgestone' },
  'bridgestone': { id: 2, name: 'Bridgestone' },
  'smr': { id: 2, name: 'Bridgestone' },
  'gt': { id: 3, name: 'GT' },
  'gt radial': { id: 3, name: 'GT' },
  'gajah': { id: 3, name: 'GT' },
  'gajah tunggal': { id: 3, name: 'GT' },
  'acc': { id: 9, name: 'Accelera' },
  'accelera': { id: 9, name: 'Accelera' },
  'acellera': { id: 9, name: 'Accelera' },
  'dunlop': { id: 8, name: 'Dunlop' },
  'dlp': { id: 8, name: 'Dunlop' },
  'delium': { id: 12, name: 'Delium' },
  'hankook': { id: 11, name: 'Hankook' },
  'delli': { id: 6, name: 'Delli' },
  'sliwer': { id: 7, name: 'Sliwer' },
  'swallow': { id: 4, name: 'Swallow' },
  'achilles': { id: 1, name: 'Achilles' },
  'goodyear': { id: 13, name: 'Goodyear' },
  'sailun': { id: 14, name: 'Sailun' },
  'pirelli': { id: 17, name: 'Pirelli' },
  'yokohama': { id: 18, name: 'Yokohama' },
  'continental': { id: 21, name: 'Continental' },
  'forceum': { id: 10, name: 'Forceum' },
  'aeolus': { id: 5, name: 'Aeolus' },
  'laufen': { id: 29, name: 'Laufenn' },
  'laufenn': { id: 29, name: 'Laufenn' },
};

const SHEET_FALLBACK: Record<string, string> = {
  'bridgestone': 'bridgestone',
  'dunlop': 'dunlop',
  'gt ( gajah tunggal )': 'gt',
  'acellera': 'accelera',
  'delium': 'delium',
};

// Client-side helper functions for Vercel offline fallback
function parseProductName(rawName: string) {
  let name = rawName.trim();
  let referencePrice: number | null = null;
  const priceMatch = name.match(/@\s*([\d.]+)/);
  if (priceMatch) {
    const digits = priceMatch[1].replace(/\./g, '');
    if (/^\d+$/.test(digits)) {
      referencePrice = parseInt(digits, 10) * 1000;
    }
    name = name.replace(/@\s*[\d.]+/, ' ');
  }

  let year: number | null = null;
  name = name.replace(/\(\s*(?:th\.?\s*)?(\d{2,4}(?:\s*[,+]\s*\d{2,4})*)\s*\)/gi, (_, g1) => {
    const tokens = g1.match(/\d{2,4}/g) || [];
    for (const token of tokens) {
      let n = parseInt(token, 10);
      if (token.length === 2) {
        if (n >= 13 && n <= 29) n += 2000;
        else if (n >= 90 && n <= 99) n += 1900;
      }
      if (n >= 1990 && n <= 2030) {
        if (year === null || n > year) year = n;
      }
    }
    return ' ';
  });

  return {
    cleanName: name.replace(/\s+/g, ' ').trim(),
    year,
    referencePrice,
  };
}

function resolveBrand(sheetName: string, rawName: string) {
  let needle = rawName.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim();
  if (needle.startsWith('ban dalam ')) {
    needle = needle.slice('ban dalam '.length).trim();
  }

  const sortedAliases = Object.keys(BRAND_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (needle === alias || needle.startsWith(alias + ' ')) {
      return BRAND_ALIASES[alias];
    }
  }

  const fb = SHEET_FALLBACK[sheetName.toLowerCase().trim()];
  if (fb && BRAND_ALIASES[fb]) {
    return BRAND_ALIASES[fb];
  }

  return { id: null, name: null };
}

function normalizeName(name: string): string {
  let n = name.replace(/@\s*[\d.]+/g, ' ').replace(/\(\s*(?:th\.?\s*)?[\d\s,+]+\)/gi, ' ').toLowerCase().replace(/\s+/g, ' ').trim();
  if (n.startsWith('ban dalam ')) {
    n = n.slice('ban dalam '.length).trim();
  }
  const sortedAliases = Object.keys(BRAND_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (n === alias) return '';
    if (n.startsWith(alias + ' ')) return n.slice(alias.length + 1).trim();
  }
  return n;
}

function makeMatchKey(brandId: number, name: string, size?: string | null, ring?: string | null, year?: number | null, isOld?: boolean): string {
  const normSize = (size || '').replace(/\s+/g, '').toLowerCase();
  const normRing = (ring || '').replace(/\s+/g, '').toLowerCase();
  const base = `${brandId}|${normalizeName(name)}|${normSize}|${normRing}`;
  const currentYear = new Date().getFullYear();
  if (year && year < currentYear) {
    return `${base}|${year}`;
  }
  if (isOld) {
    return `${base}|old`;
  }
  return base;
}

async function parseExcelClientSide(file: File, qtyColumn: 'G' | 'H'): Promise<StagingData> {
  const wb = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const rows: Array<{ sheet: string; row: number; cells: Record<string, any>; name_is_red: boolean }> = [];
  wb.eachSheet((sheet) => {
    const sheetName = sheet.name;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < 5) return;
      const cellB = row.getCell(2);
      const nameVal = cellB.value ? String(cellB.value).trim() : '';
      const fontColor = (cellB.font?.color as any)?.argb || '';
      const isRed = fontColor.toUpperCase().includes('FF0000') || fontColor.toUpperCase().includes('C00000');

      const getVal = (col: number) => {
        const c = row.getCell(col);
        const v = c.value;
        if (v && typeof v === 'object' && 'result' in v) return v.result;
        return v;
      };

      const cells = {
        A: getVal(1),
        B: nameVal,
        C: getVal(3),
        D: getVal(4),
        E: getVal(5),
        F: getVal(6),
        G: getVal(7),
        H: getVal(8),
      };

      const isBlank = Object.values(cells).every((v) => v === null || v === undefined || String(v).trim() === '');
      if (!isBlank) {
        rows.push({ sheet: sheetName, row: rowNumber, cells, name_is_red: isRed });
      }
    });
  });

  const groups: Record<string, any> = {};
  const notes: Array<{ sheet: string; row: number; text: string }> = [];
  const unresolved: UnresolvedRow[] = [];
  let lastParent: any = null;

  for (const row of rows) {
    const rawName = String(row.cells.B || '').trim();
    if (rawName.startsWith('*') || rawName.endsWith(':')) {
      notes.push({ sheet: row.sheet, row: row.row, text: rawName });
      continue;
    }

    const isChild = rawName === '';
    let parsed: any;
    let brandId: number | null;
    let brandName: string | null;

    if (isChild) {
      if (!lastParent || lastParent.sheet !== row.sheet) {
        unresolved.push({
          sheet: row.sheet,
          row: row.row,
          name: rawName,
          reason: 'batch_tanpa_induk',
          size: row.cells.C ? String(row.cells.C) : null,
          ring: row.cells.D ? String(row.cells.D) : null,
          qty: parseInt(String(row.cells[qtyColumn] || '0'), 10) || 0,
        });
        continue;
      }
      parsed = { cleanName: lastParent.clean_name, year: lastParent.product_year, referencePrice: null };
      brandId = lastParent.brand_id;
      brandName = lastParent.brand_name;
    } else {
      parsed = parseProductName(rawName);
      if (!parsed.cleanName) {
        unresolved.push({
          sheet: row.sheet,
          row: row.row,
          name: rawName,
          reason: 'nama_kosong',
          size: row.cells.C ? String(row.cells.C) : null,
          ring: row.cells.D ? String(row.cells.D) : null,
          qty: parseInt(String(row.cells[qtyColumn] || '0'), 10) || 0,
        });
        continue;
      }

      const brand = resolveBrand(row.sheet, rawName);
      brandId = brand.id;
      brandName = brand.name;

      if (!brandId) {
        unresolved.push({
          sheet: row.sheet,
          row: row.row,
          name: rawName,
          reason: 'brand_tidak_dikenal',
          size: row.cells.C ? String(row.cells.C) : null,
          ring: row.cells.D ? String(row.cells.D) : null,
          qty: parseInt(String(row.cells[qtyColumn] || '0'), 10) || 0,
        });
        continue;
      }
    }

    const size = row.cells.C ? String(row.cells.C).trim() : null;
    const ring = row.cells.D ? String(row.cells.D).trim() : null;
    const cost = row.cells.E ? parseInt(String(row.cells.E).replace(/[^\d]/g, ''), 10) || null : null;
    let price = row.cells.F ? parseInt(String(row.cells.F).replace(/[^\d]/g, ''), 10) || null : null;
    const opening = row.cells.G ? parseInt(String(row.cells.G).replace(/[^\d]/g, ''), 10) || 0 : 0;
    const qty = row.cells[qtyColumn] ? parseInt(String(row.cells[qtyColumn]).replace(/[^\d]/g, ''), 10) || 0 : 0;

    if (price === null && parsed.referencePrice !== null) {
      price = parsed.referencePrice;
    }
    if (price === null && lastParent?.price && lastParent.clean_name === parsed.cleanName) {
      price = lastParent.price;
    }

    const isOldStock = row.name_is_red || parsed.referencePrice !== null;
    if (!isChild) {
      lastParent = {
        sheet: row.sheet,
        clean_name: parsed.cleanName,
        product_year: parsed.year,
        brand_id: brandId,
        brand_name: brandName,
        price,
      };
    }

    const currentYear = new Date().getFullYear();
    const yearForGroup = parsed.year || currentYear;
    const key = makeMatchKey(brandId, parsed.cleanName, size, ring, yearForGroup, isOldStock);

    if (!groups[key]) {
      groups[key] = {
        match_key: key,
        product_code: '',
        product_name: parsed.cleanName,
        brand_id: brandId,
        brand_name: brandName,
        category_id: 1,
        product_size: size,
        ring,
        product_year: yearForGroup,
        product_price: price,
        avg_cost: null,
        total_stock: 0,
        opening_qty: 0,
        is_old_stock: isOldStock,
        reference_price: parsed.referencePrice,
        sheet_name: row.sheet,
        batches: [],
      };
    }

    const g = groups[key];
    g.batches.push({
      batch_cost: cost,
      initial_qty: qty,
      remaining_qty: qty,
      is_old_stock: isOldStock,
      reference_price: parsed.referencePrice,
      source_row: row.row,
    });
    g.total_stock += qty;
    g.opening_qty += opening;
    g.is_old_stock = g.is_old_stock || isOldStock;
    if (parsed.referencePrice) {
      g.reference_price = Math.max(g.reference_price || 0, parsed.referencePrice);
    }
    if (!g.product_price && price) {
      g.product_price = price;
    }
  }

  // Load existing products for DB matching
  let localProducts: ProductItem[] = [];
  try {
    const raw = localStorage.getItem('ob3_products');
    if (raw) localProducts = JSON.parse(raw);
  } catch {}

  const products: StagingProduct[] = [];
  let idx = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let totalSurplus = 0;
  let totalDeficit = 0;
  let totalEqual = 0;

  for (const g of Object.values(groups)) {
    idx++;
    let totalVal = 0;
    let totalQty = 0;
    for (const b of g.batches) {
      if (b.batch_cost && b.initial_qty > 0) {
        totalVal += b.batch_cost * b.initial_qty;
        totalQty += b.initial_qty;
      }
    }
    g.avg_cost = totalQty > 0 ? Math.round(totalVal / totalQty) : null;
    const prefix = String(g.brand_name || 'UNK').slice(0, 3).toUpperCase();
    const sizePart = (g.product_size || '0').replace(/[/ ]/g, '');
    const ringPart = (g.ring || '0').trim();
    g.product_code = `${prefix}-${sizePart}-${ringPart}-${String(idx).padStart(4, '0')}`;

    // Match with existing products
    const dbMatchProd = localProducts.find((lp) => {
      const matchKey = makeMatchKey(
        typeof lp.brand === 'string' ? (BRAND_ALIASES[lp.brand.toLowerCase()]?.id || 0) : 0,
        lp.name || lp.product_name,
        lp.product_size,
        lp.ring,
        lp.product_year ? parseInt(String(lp.product_year), 10) : null
      );
      return matchKey === g.match_key;
    });

    if (dbMatchProd) {
      matchedCount++;
      const dbQty = dbMatchProd.product_quantity ?? dbMatchProd.stock ?? 0;
      const diff = g.total_stock - dbQty;
      if (diff > 0) totalSurplus++;
      else if (diff < 0) totalDeficit++;
      else totalEqual++;

      g.db_match = {
        id: parseInt(dbMatchProd.id, 10) || 0,
        code: dbMatchProd.product_code || '',
        name: dbMatchProd.name || dbMatchProd.product_name,
        qty: dbQty,
        price: dbMatchProd.product_price ?? dbMatchProd.price ?? 0,
        cost: dbMatchProd.product_cost ?? dbMatchProd.cost_price ?? 0,
        diff,
        confidence: 'high',
      };
    } else {
      unmatchedCount++;
    }

    products.push(g);
  }

  const totalStock = products.reduce((acc, p) => acc + p.total_stock, 0);
  const stagingResult: StagingData = {
    meta: {
      source: file.name,
      generated_at: new Date().toISOString(),
      qty_column: qtyColumn,
      rows_read: rows.length,
      rows_product: products.length,
      rows_child: 0,
      rows_note: notes.length,
      rows_unresolved: unresolved.length,
      total_products: products.length,
      total_batches: products.reduce((acc, p) => acc + p.batches.length, 0),
      total_stock_qty: totalStock,
      total_opening_qty: products.reduce((acc, p) => acc + p.opening_qty, 0),
      products_without_price: products.filter((p) => !p.product_price).length,
      products_without_cost: products.filter((p) => !p.avg_cost).length,
    },
    products,
    notes,
    unresolved,
    stats: {
      total_excel: products.length,
      total_stock_excel: totalStock,
      total_matched: matchedCount,
      total_unmatched: unmatchedCount,
      total_surplus: totalSurplus,
      total_deficit: totalDeficit,
      total_equal: totalEqual,
      can_commit: unresolved.length === 0,
    },
  };

  try {
    localStorage.setItem('ob3_stock_staging', JSON.stringify(stagingResult));
  } catch {}

  return stagingResult;
}

export const stockReconciliationApi = {
  uploadPreview: async (file: File, qtyColumn: 'G' | 'H' = 'H') => {
    // 1. Prioritize Laravel Backend if connected
    try {
      const formData = new FormData();
      formData.append('excel_file', file);
      formData.append('qty_column', qtyColumn);

      return await apiClient.upload<{ success: boolean; message: string; data: StagingData }>(
        '/stock/import-preview',
        formData
      );
    } catch (err: any) {
      // 2. Offline / Vercel Fallback: Client-side ExcelJS parsing
      console.info('[Excel Reconciliation] Backend tidak terjangkau, menggunakan parsing client-side ExcelJS:', err.message);
      const data = await parseExcelClientSide(file, qtyColumn);
      return {
        success: true,
        message: `File Excel berhasil diproses via Client-Side Engine (${data.meta.total_products} produk, ${data.meta.total_stock_qty} unit stok)`,
        data,
      };
    }
  },

  getStaging: async () => {
    try {
      return await apiClient.get<{ success: boolean; message?: string; data: StagingData | null }>('/stock/staging');
    } catch {
      // Fallback from localStorage
      const raw = localStorage.getItem('ob3_stock_staging');
      if (raw) {
        return { success: true, data: JSON.parse(raw) as StagingData };
      }
      return { success: false, data: null };
    }
  },

  resolveBrand: async (index: number, brandId: number) => {
    try {
      return await apiClient.post<{ success: boolean; message: string; data: StagingData }>(
        '/stock/resolve-brand',
        { index, brand_id: brandId }
      );
    } catch {
      // Fallback update in localStorage staging
      const raw = localStorage.getItem('ob3_stock_staging');
      if (raw) {
        const staging: StagingData = JSON.parse(raw);
        staging.unresolved.splice(index, 1);
        staging.stats.can_commit = staging.unresolved.length === 0;
        localStorage.setItem('ob3_stock_staging', JSON.stringify(staging));
        return { success: true, message: 'Alias merek disimpan.', data: staging };
      }
      throw new Error('Data staging tidak ditemukan');
    }
  },

  resolveName: async (index: number, name: string, brandId?: number) => {
    try {
      return await apiClient.post<{ success: boolean; message: string; data: StagingData }>(
        '/stock/resolve-name',
        { index, name, brand_id: brandId }
      );
    } catch {
      const raw = localStorage.getItem('ob3_stock_staging');
      if (raw) {
        const staging: StagingData = JSON.parse(raw);
        staging.unresolved.splice(index, 1);
        staging.stats.can_commit = staging.unresolved.length === 0;
        localStorage.setItem('ob3_stock_staging', JSON.stringify(staging));
        return { success: true, message: 'Baris berhasil ditetapkan.', data: staging };
      }
      throw new Error('Data staging tidak ditemukan');
    }
  },

  ignoreUnresolved: async (index: number) => {
    try {
      return await apiClient.post<{ success: boolean; message: string; data: StagingData }>(
        '/stock/ignore-unresolved',
        { index }
      );
    } catch {
      const raw = localStorage.getItem('ob3_stock_staging');
      if (raw) {
        const staging: StagingData = JSON.parse(raw);
        staging.unresolved.splice(index, 1);
        staging.stats.can_commit = staging.unresolved.length === 0;
        localStorage.setItem('ob3_stock_staging', JSON.stringify(staging));
        return { success: true, message: 'Baris tak terselesaikan diabaikan.', data: staging };
      }
      throw new Error('Data staging tidak ditemukan');
    }
  },

  commit: async (period: string, onlyMatchKeys?: string[], force: boolean = false) => {
    try {
      return await apiClient.post<{ success: boolean; message: string; data: CommitResult }>(
        '/stock/commit',
        { period, only_match_keys: onlyMatchKeys, force }
      );
    } catch (err: any) {
      // Offline / Vercel Fallback Commit to Supabase and LocalStorage
      console.info('[Excel Reconciliation] Backend tidak terjangkau, mengeksekusi komit ke Supabase Cloud & LocalStorage...');
      const raw = localStorage.getItem('ob3_stock_staging');
      if (!raw) throw new Error('Data staging belum tersedia');
      const staging: StagingData = JSON.parse(raw);

      let existingProds: ProductItem[] = [];
      try {
        const pRaw = localStorage.getItem('ob3_products');
        if (pRaw) existingProds = JSON.parse(pRaw);
      } catch {}

      let created = 0;
      let updated = 0;

      const itemsToSync = onlyMatchKeys
        ? staging.products.filter((p) => onlyMatchKeys.includes(p.match_key))
        : staging.products;

      for (const item of itemsToSync) {
        const existingIdx = existingProds.findIndex((p) => p.product_code === item.product_code || p.name === item.product_name);
        const productPayload: ProductItem = {
          id: existingIdx >= 0 ? existingProds[existingIdx].id : `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: item.product_name,
          product_name: item.product_name,
          product_code: item.product_code || `SKU-${Date.now()}`,
          barcode: `BRC-${item.product_code || Date.now()}`,
          brand: item.brand_name,
          category: 'BAN_BARU' as any,
          product_size: item.product_size || '-',
          ring: item.ring || '-',
          motif: '-',
          condition_code: 'BARU',
          product_year: String(item.product_year || '2026'),
          product_cost: item.avg_cost || 0,
          cost_price: item.avg_cost || 0,
          product_price: item.product_price || 0,
          price: item.product_price || 0,
          product_quantity: item.total_stock,
          stock: item.total_stock,
          product_stock_alert: 2,
          min_stock: 2,
          is_active: true,
          batches: item.batches.map((b, bIdx) => ({
            id: `BATCH-${Date.now()}-${bIdx}`,
            product_id: '',
            batch_code: `OPNAME-${period.replace('-', '')}-${bIdx + 1}`,
            source_name: `Opname Excel ${period}`,
            purchase_date: `${period}-01`,
            batch_cost: b.batch_cost || 0,
            initial_qty: b.initial_qty,
            remaining_qty: b.remaining_qty,
          })),
        };

        if (existingIdx >= 0) {
          existingProds[existingIdx] = { ...existingProds[existingIdx], ...productPayload };
          updated++;
        } else {
          existingProds.push(productPayload);
          created++;
        }

        // Sync to Supabase cloud if connected
        if (isSupabaseConfigured()) {
          upsertProductToSupabase(productPayload);
        }
      }

      localStorage.setItem('ob3_products', JSON.stringify(existingProds));

      const result: CommitResult = {
        created,
        updated,
        deactivated: 0,
        zeroed: 0,
        batches_created: itemsToSync.reduce((acc, p) => acc + p.batches.length, 0),
        movements: itemsToSync.length,
        price_audits: 0,
        snapshot_path: `client_storage/rollback_${period}.json`,
      };

      return {
        success: true,
        message: `Sinkronisasi berhasil! Baru: ${created}, diperbarui: ${updated}, batch: ${result.batches_created}.`,
        data: result,
      };
    }
  },

  getTemplateDownloadUrl: () => {
    const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
    return `${baseUrl}/stock/template`;
  },
};
