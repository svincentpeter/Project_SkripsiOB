import { 
  CreateProductInput, 
  GoodsReceiptInput, 
  PosTransaction, 
  ProductBatch, 
  StockMutation, 
  TireBrand, 
  TireProduct, 
  TireRing 
} from '../shared/types';

// ============================================================================
// 1. AUTONUMERIC ENGINE: SMART SEMANTIC CODES
// ============================================================================

/**
 * Generate smart SKU code based on Brand, Width, Ratio, Ring, and Motif
 * Format: [BRAND_3]-[WIDTH][RATIO][RING]-[MOTIF_3] (e.g. BRI-1856515-TUR)
 */
export const generateProductSku = (
  brand: string,
  width: number | string,
  ratio: string,
  ring: string,
  motif: string
): string => {
  const brandMap: Record<string, string> = {
    Bridgestone: 'BRI',
    Accelera: 'ACC',
    Dunlop: 'DNL',
    Forceum: 'FOR',
    Hankook: 'HNK',
    GTRadial: 'GTR',
  };

  const brandCode = brandMap[brand] || brand.substring(0, 3).toUpperCase();
  const cleanWidth = String(width).replace(/[^0-9]/g, '');
  const cleanRatio = String(ratio).replace(/[^0-9]/g, '');
  const cleanRing = String(ring).replace(/[^0-9]/g, '');
  const sizeBlock = `${cleanWidth}${cleanRatio}${cleanRing}`;

  const cleanMotif = motif.trim().split(/[\s-]+/)[0].substring(0, 4).toUpperCase();
  const motifBlock = cleanMotif || 'STD';

  return `${brandCode}-${sizeBlock}-${motifBlock}`;
};

/**
 * Generate standard 13-digit EAN-13 barcode with GS1 Indonesia prefix (899)
 * Format: 899 (Indonesia) + 300 (OB3) + 6 digits + 1 checksum digit
 */
export const generateBarcodeEan13 = (existingBarcodes: string[] = []): string => {
  const existingSet = new Set(existingBarcodes);

  for (let attempt = 0; attempt < 500; attempt++) {
    const prefix = '899300';
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const raw12 = `${prefix}${randomDigits}`;

    // Calculate EAN-13 checksum (modulo 10 with 1 and 3 weights)
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const num = parseInt(raw12[i], 10);
      sum += i % 2 === 0 ? num : num * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    const barcode = `${raw12}${checksum}`;

    if (!existingSet.has(barcode)) {
      return barcode;
    }
  }

  return `899300${Date.now().toString().slice(-7)}`;
};

/**
 * Generate unique Goods Receipt Note (GRN) number
 * Format: GRN-OB3-YYYYMMDD-XXXX (e.g. GRN-OB3-20260903-0001)
 */
export const generateGrnNumber = (existingMutations: StockMutation[] = []): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;
  const prefix = `GRN-OB3-${dateStr}-`;

  let maxSeq = 0;
  existingMutations.forEach((m) => {
    if (m.ref_doc && m.ref_doc.startsWith(prefix)) {
      const seqStr = m.ref_doc.substring(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * Generate unique FIFO Batch Code
 * Format: BATCH-YYYYMMDD-XXX (e.g. BATCH-20260903-01)
 */
export const generateBatchCode = (existingBatches: ProductBatch[] = []): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;
  const prefix = `BATCH-${dateStr}-`;

  let maxSeq = 0;
  existingBatches.forEach((b) => {
    if (b.batch_code && b.batch_code.startsWith(prefix)) {
      const seqStr = b.batch_code.substring(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * Generate unique Stock Mutation Reference ID
 * Format: MUT-YYYYMMDD-XXXX
 */
export const generateMutationId = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MUT-${y}${m}${d}-${rand}`;
};

/**
 * Generate unique Stock Opname Document Number
 * Format: OPNAME-OB3-YYYYMM-XXXX
 */
export const generateOpnameDocNumber = (existingMutations: StockMutation[] = []): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `OPNAME-OB3-${y}${m}-`;

  let maxSeq = 0;
  existingMutations.forEach((mut) => {
    if (mut.ref_doc && mut.ref_doc.startsWith(prefix)) {
      const seqStr = mut.ref_doc.substring(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

// ============================================================================
// 2. INVENTORY BUSINESS OPERATIONS (CRUD & GOODS RECEIPT)
// ============================================================================

/**
 * Create a new TireProduct entity with optional initial FIFO batch & mutation
 */
export const createProductWithInitialStock = (
  input: CreateProductInput,
  existingProducts: TireProduct[] = [],
  existingMutations: StockMutation[] = []
): { product: TireProduct; initialBatch?: ProductBatch; mutation?: StockMutation } => {
  const existingBarcodes = existingProducts.map((p) => p.barcode).filter(Boolean);
  const sku = input.product_code?.trim() || generateProductSku(
    input.brand,
    input.size_width,
    input.size_ratio,
    input.ring,
    input.motif
  );
  const barcode = input.barcode?.trim() || generateBarcodeEan13(existingBarcodes);

  const newId = `tire-${Date.now()}-${Math.floor(Math.random() * 100)}`;
  const productSize = `${input.size_width}/${input.size_ratio} ${input.ring}`;
  const initialStock = Number(input.initial_stock) || 0;
  const cost = Number(input.product_cost) || 0;
  const price = Number(input.product_price) || 0;
  const minStock = Number(input.product_stock_alert) || 5;

  let initialBatch: ProductBatch | undefined;
  let mutation: StockMutation | undefined;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const fullDateTime = `${dateStr} ${timeStr}`;

  if (initialStock > 0) {
    const allBatches = existingProducts.flatMap((p) => p.batches || []);
    const batchCode = generateBatchCode(allBatches);
    const supplier = input.supplier_name?.trim() || `Distributor Resmi ${input.brand}`;

    initialBatch = {
      id: `batch-${Date.now()}`,
      product_id: newId,
      batch_code: batchCode,
      source_name: supplier,
      batch_cost: cost,
      initial_qty: initialStock,
      remaining_qty: initialStock,
      purchase_date: dateStr,
    };

    mutation = {
      id: generateMutationId(),
      tire_id: newId,
      product_id: newId,
      tire_name: input.product_name,
      product_name: input.product_name,
      tire_size: productSize,
      date: fullDateTime,
      ref_doc: `INIT-STOCK-OB3-${dateStr.replace(/-/g, '')}`,
      type: 'MASUK',
      qty: initialStock,
      balance: initialStock,
      notes: `Saldo awal master ban baru dari ${supplier} (${batchCode})`,
      description: `Saldo awal master ban baru dari ${supplier}`,
      operator: 'Admin Inventori OB3',
    };
  }

  const brandColorMap: Record<TireBrand, string> = {
    Bridgestone: 'from-blue-900 to-slate-900',
    Accelera: 'from-cyan-900 to-slate-900',
    Dunlop: 'from-yellow-900 to-slate-900',
    Forceum: 'from-red-900 to-slate-900',
    Hankook: 'from-orange-900 to-slate-900',
    GTRadial: 'from-emerald-900 to-slate-900',
  };

  const product: TireProduct = {
    id: newId,
    brand: input.brand,
    product_name: input.product_name,
    name: input.product_name,
    product_code: sku,
    barcode: barcode,
    product_size: productSize,
    size: productSize,
    size_width: Number(input.size_width),
    size_ratio: String(input.size_ratio),
    ring: input.ring,
    motif: input.motif,
    pattern: input.motif,
    product_year: input.product_year,
    condition_code: 'BARU',
    product_quantity: initialStock,
    stock: initialStock,
    product_stock_alert: minStock,
    min_stock: minStock,
    product_cost: cost,
    cost_price: cost,
    cost: cost,
    product_price: price,
    price: price,
    is_active: true,
    is_old_stock: false,
    image_placeholder_color: brandColorMap[input.brand] || 'from-slate-800 to-slate-900',
    batches: initialBatch ? [initialBatch] : [],
  };

  return { product, initialBatch, mutation };
};

/**
 * Process incoming goods receipt (restock)
 * Adds a new FIFO layer, increases stock, and records mutation
 */
export const processGoodsReceipt = (
  product: TireProduct,
  input: GoodsReceiptInput,
  existingMutations: StockMutation[] = []
): { updatedProduct: TireProduct; newBatch: ProductBatch; mutation: StockMutation } => {
  const incomingQty = Number(input.incoming_qty);
  if (incomingQty <= 0) {
    throw new Error('Jumlah ban masuk harus lebih besar dari 0.');
  }

  const unitCost = Number(input.unit_cost);
  if (unitCost <= 0) {
    throw new Error('Harga beli (HPP) per unit harus lebih besar dari 0.');
  }

  const now = new Date();
  const dateStr = input.receipt_date || now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const fullDateTime = `${dateStr} ${timeStr}`;

  const currentBatches = product.batches || [];
  const batchCode = generateBatchCode(currentBatches);
  const grnDoc = generateGrnNumber(existingMutations);

  const newBatch: ProductBatch = {
    id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    product_id: product.id,
    batch_code: batchCode,
    source_name: input.supplier_name.trim(),
    batch_cost: unitCost,
    initial_qty: incomingQty,
    remaining_qty: incomingQty,
    purchase_date: dateStr,
  };

  const newStock = product.stock + incomingQty;

  const mutation: StockMutation = {
    id: generateMutationId(),
    tire_id: product.id,
    product_id: product.id,
    tire_name: product.product_name ?? product.name,
    product_name: product.product_name ?? product.name,
    tire_size: product.product_size ?? product.size ?? '',
    date: fullDateTime,
    ref_doc: grnDoc,
    type: 'MASUK',
    qty: incomingQty,
    balance: newStock,
    notes: `Penerimaan Restock dari ${input.supplier_name}. ${
      input.supplier_invoice ? 'No. SJ/Faktur: ' + input.supplier_invoice + '. ' : ''
    }${input.notes || ''}`.trim(),
    description: `Restock dari ${input.supplier_name} (${batchCode})`,
    operator: input.operator || 'Gudang OB3',
  };

  const updatedProduct: TireProduct = {
    ...product,
    product_quantity: newStock,
    stock: newStock,
    product_cost: unitCost,
    cost_price: unitCost,
    cost: unitCost,
    batches: [...currentBatches, newBatch],
  };

  return { updatedProduct, newBatch, mutation };
};

/**
 * Check whether product can be permanently deleted or must be soft-deleted
 */
export const canSafelyDeleteProduct = (
  product: TireProduct,
  mutations: StockMutation[] = [],
  transactions: PosTransaction[] = []
): { canDelete: boolean; reason?: string } => {
  // Check transaction history
  const hasTx = transactions.some((tx) =>
    tx.items.some((item) => item.product.id === product.id)
  );
  if (hasTx) {
    return {
      canDelete: false,
      reason: 'Produk sudah tercatat di riwayat transaksi kasir. Disarankan untuk menonaktifkan status produk (Soft Delete).',
    };
  }

  // Check mutation history (more than initial mutation)
  const productMutations = mutations.filter((m) => m.tire_id === product.id);
  if (productMutations.length > 1) {
    return {
      canDelete: false,
      reason: 'Produk memiliki riwayat mutasi stok aktif di kartu stok. Disarankan untuk menonaktifkan status produk.',
    };
  }

  // Check stock
  if (product.stock > 0) {
    return {
      canDelete: false,
      reason: `Produk masih memiliki sisa fisik ${product.stock} pcs di gudang.`,
    };
  }

  return { canDelete: true };
};

/**
 * Calculate total inventory valuation and summary statistics
 */
export const calculateInventoryValuation = (
  products: TireProduct[]
): {
  totalPcs: number;
  totalValuationHpp: number;
  totalValuationJual: number;
  lowStockCount: number;
  outOfStockCount: number;
} => {
  let totalPcs = 0;
  let totalValuationHpp = 0;
  let totalValuationJual = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    // Only count active products if specified
    if (p.is_active === false) return;

    totalPcs += p.stock;
    totalValuationHpp += p.stock * (p.cost_price ?? p.product_cost ?? 0);
    totalValuationJual += p.stock * (p.product_price ?? p.price ?? 0);

    const minAlert = p.product_stock_alert ?? p.min_stock ?? 5;
    if (p.stock <= 0) {
      outOfStockCount++;
    } else if (p.stock < minAlert) {
      lowStockCount++;
    }
  });

  return {
    totalPcs,
    totalValuationHpp,
    totalValuationJual,
    lowStockCount,
    outOfStockCount,
  };
};

// ============================================================================
// 3. LEGACY ADAPTERS (BACKWARDS COMPATIBILITY)
// ============================================================================

export const createStockMutationRecord = (
  product: TireProduct,
  mutationType: 'IN' | 'OUT' | 'ADJUSTMENT_PLUS' | 'ADJUSTMENT_MINUS',
  qty: number,
  beforeQty: number,
  referenceNo: string,
  notes: string,
  operator: string = 'Gudang OB3'
): StockMutation => {
  const afterQty =
    mutationType === 'IN' || mutationType === 'ADJUSTMENT_PLUS'
      ? beforeQty + qty
      : beforeQty - qty;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const mappedType: 'MASUK' | 'KELUAR' | 'PENYESUAIAN' =
    mutationType === 'IN'
      ? 'MASUK'
      : mutationType === 'OUT'
      ? 'KELUAR'
      : 'PENYESUAIAN';

  return {
    id: generateMutationId(),
    tire_id: product.id,
    product_id: product.id,
    tire_name: product.product_name ?? product.name,
    product_name: product.product_name ?? product.name,
    tire_size: product.product_size ?? product.size ?? '',
    date: dateStr,
    ref_doc: referenceNo,
    type: mappedType,
    qty: qty,
    balance: afterQty,
    notes: notes,
    description: notes,
    operator: operator,
  };
};

export const calculateOpnameVariance = (
  systemQty: number,
  physicalQty: number,
  unitCost: number
): { diffQty: number; diffAmount: number; status: 'MATCH' | 'SURPLUS' | 'DEFICIT' } => {
  const diffQty = physicalQty - systemQty;
  const diffAmount = diffQty * unitCost;

  let status: 'MATCH' | 'SURPLUS' | 'DEFICIT' = 'MATCH';
  if (diffQty > 0) status = 'SURPLUS';
  if (diffQty < 0) status = 'DEFICIT';

  return {
    diffQty,
    diffAmount,
    status,
  };
};
