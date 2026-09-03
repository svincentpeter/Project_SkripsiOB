import { ProductBatch, TireProduct } from '../shared/types';

export interface FifoAllocationResult {
  allocatedBatches: {
    batch_code: string;
    batch_id?: string;
    qty: number;
    unit_cost: number;
    subtotal_cost: number;
  }[];
  totalHpp: number;
  updatedBatches: ProductBatch[];
}

/**
 * Memotong kuantitas dari batch pembelian ban dengan tanggal terlama terlebih dahulu (FIFO Costing Engine)
 */
export const allocateFifoBatches = (
  product: TireProduct,
  qtySold: number
): FifoAllocationResult => {
  const batches = product.batches ? [...product.batches] : [];
  let remainingQtyToAllocate = qtySold;
  let totalHpp = 0;
  const allocatedBatches: FifoAllocationResult['allocatedBatches'] = [];

  const updatedBatches = batches.map((batch) => {
    if (remainingQtyToAllocate <= 0 || batch.remaining_qty <= 0) {
      return batch;
    }

    const consumeQty = Math.min(batch.remaining_qty, remainingQtyToAllocate);
    const subtotalCost = consumeQty * batch.batch_cost;

    totalHpp += subtotalCost;
    remainingQtyToAllocate -= consumeQty;

    allocatedBatches.push({
      batch_code: batch.batch_code,
      batch_id: batch.id,
      qty: consumeQty,
      unit_cost: batch.batch_cost,
      subtotal_cost: subtotalCost,
    });

    return {
      ...batch,
      remaining_qty: batch.remaining_qty - consumeQty,
    };
  });

  // Fallback jika tidak ada batch terdaftar atau kuantitas batch kurang dari penjualan
  if (remainingQtyToAllocate > 0) {
    const fallbackUnitCost = product.product_cost ?? product.cost ?? 0;
    const fallbackCost = remainingQtyToAllocate * fallbackUnitCost;
    totalHpp += fallbackCost;
    allocatedBatches.push({
      batch_code: 'BATCH-DEFAULT',
      qty: remainingQtyToAllocate,
      unit_cost: fallbackUnitCost,
      subtotal_cost: fallbackCost,
    });
  }

  return {
    allocatedBatches,
    totalHpp,
    updatedBatches,
  };
};
