import { ProductItem, PosTransaction, StockMutation } from '../shared/types';

export interface StockLedgerLayer {
  batch_id: string | number | null;
  batch_cost: number;
  initial_qty: number;
  remaining_qty: number;
  sold: number;
  valuation: number;
  daily_sales: Record<number, number>;
}

export interface StockLedgerRow {
  id: string;
  product_code: string;
  product_name: string;
  brand_name: string;
  motif: string;
  product_size: string;
  ring: string;
  product_cost: number;
  product_price: number;
  reference_price?: number;
  is_old_stock?: boolean;
  opening: number;
  restock: number;
  sold: number;
  remaining: number;
  daily_sales: Record<number, number>;
  layers: StockLedgerLayer[];
}

export interface StockLedgerSummary {
  total_products: number;
  total_valuation_cogs: number;
  total_opening: number;
  total_restock: number;
  total_sold: number;
  total_remaining: number;
  empty_stock_count: number;
  low_stock_count: number;
}

export interface StockLedgerMeta {
  month: string;
  year: number;
  month_num: number;
  days_in_month: number;
  brand_options: string[];
  total_rows: number;
}

export interface StockMonthlyReportData {
  rows: StockLedgerRow[];
  summary: StockLedgerSummary;
  meta: StockLedgerMeta;
}

/**
 * Client-side calculation for Stock Monthly Ledger with FIFO layers.
 * Acts as fallback or instant preview from in-memory state.
 */
export function calculateClientStockLedger(
  products: ProductItem[] = [],
  transactions: PosTransaction[] = [],
  mutations: StockMutation[] = [],
  month: string = new Date().toISOString().substring(0, 7),
  brandFilter?: string
): StockMonthlyReportData {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const monthNum = parseInt(monthStr, 10) || new Date().getMonth() + 1;
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

  // Filter products by brand if specified
  const filteredProducts = products.filter((p) => {
    if (!p.is_active && (p.product_quantity ?? 0) <= 0) return false;
    if (brandFilter && brandFilter !== 'ALL') {
      return (p.brand || '').toLowerCase() === brandFilter.toLowerCase();
    }
    return true;
  });

  // Sort products: Brand -> Ring -> Size -> Motif -> Cost
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const brandA = a.brand || '';
    const brandB = b.brand || '';
    if (brandA !== brandB) return brandA.localeCompare(brandB);

    const ringA = parseInt(String(a.ring || '').replace(/\D/g, ''), 10) || 999;
    const ringB = parseInt(String(b.ring || '').replace(/\D/g, ''), 10) || 999;
    if (ringA !== ringB) return ringA - ringB;

    const sizeA = a.product_size || '';
    const sizeB = b.product_size || '';
    if (sizeA !== sizeB) return sizeA.localeCompare(sizeB);

    const costA = a.product_cost || 0;
    const costB = b.product_cost || 0;
    return costA - costB;
  });

  // Calculate daily sales per product for this month
  const dailySalesMap: Record<string, Record<number, number>> = {};

  transactions.forEach((tx) => {
    if (tx.status === 'VOID') return;
    const txDate = new Date(tx.date);
    if (txDate >= startDate && txDate <= endDate) {
      const day = txDate.getDate();
      tx.items.forEach((item) => {
        if (!dailySalesMap[item.product_id]) {
          dailySalesMap[item.product_id] = {};
        }
        dailySalesMap[item.product_id][day] = (dailySalesMap[item.product_id][day] || 0) + item.quantity;
      });
    }
  });

  // Calculate restock per product for this month
  const restockMap: Record<string, number> = {};
  mutations.forEach((mut) => {
    const mutDate = new Date(mut.date);
    if (mutDate >= startDate && mutDate <= endDate) {
      if (mut.type === 'IN') {
        restockMap[mut.product_id] = (restockMap[mut.product_id] || 0) + mut.quantity;
      }
    }
  });

  let totalValuationCogs = 0;
  let totalOpening = 0;
  let totalRestock = 0;
  let totalSold = 0;
  let totalRemaining = 0;
  let emptyCount = 0;
  let lowCount = 0;

  const rows: StockLedgerRow[] = sortedProducts.map((product) => {
    const pDaily = dailySalesMap[product.id] || {};
    const pSold = Object.values(pDaily).reduce((sum, q) => sum + q, 0);
    const pRestock = restockMap[product.id] || 0;
    const pOpening = product.stok_awal ?? product.product_quantity ?? 0;
    const pRemaining = product.product_quantity ?? pOpening + pRestock - pSold;

    totalOpening += pOpening;
    totalRestock += pRestock;
    totalSold += pSold;
    totalRemaining += pRemaining;

    if (pRemaining <= 0) {
      emptyCount++;
    } else if (pRemaining <= 2) {
      lowCount++;
    }

    // Build FIFO Layers
    const layers: StockLedgerLayer[] = [];
    const activeBatches = product.batches || [];

    if (activeBatches.length > 0) {
      // Group batches by cost
      const costGroups: Record<number, { batch_id: string | number; initial: number; remaining: number }> = {};
      activeBatches.forEach((b) => {
        const cost = b.batch_cost;
        if (!costGroups[cost]) {
          costGroups[cost] = { batch_id: b.id, initial: 0, remaining: 0 };
        }
        costGroups[cost].initial += b.initial_qty;
        costGroups[cost].remaining += b.remaining_qty;
      });

      // Sort cost layers ascending (FIFO)
      const sortedCosts = Object.keys(costGroups).map(Number).sort((a, b) => a - b);
      let salesToDistribute = pSold;

      sortedCosts.forEach((cost) => {
        const g = costGroups[cost];
        const layerSold = Math.min(g.initial, salesToDistribute);
        salesToDistribute = Math.max(0, salesToDistribute - layerSold);
        const valuation = g.remaining * cost;
        totalValuationCogs += valuation;

        layers.push({
          batch_id: g.batch_id,
          batch_cost: cost,
          initial_qty: g.initial,
          remaining_qty: g.remaining,
          sold: layerSold,
          valuation,
          daily_sales: pDaily,
        });
      });
    } else {
      // Fallback single layer from product cost
      const cost = product.product_cost || 0;
      const valuation = Math.max(0, pRemaining) * cost;
      totalValuationCogs += valuation;

      layers.push({
        batch_id: null,
        batch_cost: cost,
        initial_qty: pOpening,
        remaining_qty: Math.max(0, pRemaining),
        sold: pSold,
        valuation,
        daily_sales: pDaily,
      });
    }

    return {
      id: product.id,
      product_code: product.product_code,
      product_name: product.product_name,
      brand_name: product.brand || '-',
      motif: (product as any).motif || '-',
      product_size: product.product_size || '-',
      ring: product.ring || '-',
      product_cost: product.product_cost,
      product_price: product.product_price,
      reference_price: product.reference_price,
      is_old_stock: product.is_old_stock,
      opening: pOpening,
      restock: pRestock,
      sold: pSold,
      remaining: pRemaining,
      daily_sales: pDaily,
      layers,
    };
  });

  // Extract distinct brand options
  const brandOptions = Array.from(
    new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b && b.trim())))
  ).sort();

  return {
    rows,
    summary: {
      total_products: rows.length,
      total_valuation_cogs: totalValuationCogs,
      total_opening: totalOpening,
      total_restock: totalRestock,
      total_sold: totalSold,
      total_remaining: totalRemaining,
      empty_stock_count: emptyCount,
      low_stock_count: lowCount,
    },
    meta: {
      month,
      year,
      month_num: monthNum,
      days_in_month: daysInMonth,
      brand_options: brandOptions,
      total_rows: rows.length,
    },
  };
}
