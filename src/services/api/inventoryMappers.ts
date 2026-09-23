import {
  CreateProductInput,
  DebtPaymentInput,
  GoodsReceiptInput,
  PayableInvoice,
  ProductCategory,
  ServiceCategoryItem,
  StockMutation,
  SupplierItem,
  UpdateProductInput,
} from '../../shared/types';

// ---------------------------------------------------------------------------
// Bentuk respons server
// ---------------------------------------------------------------------------

export interface ApiProductCategory {
  id: number;
  category_code: string;
  category_name: string;
  description?: string | null;
  is_active: boolean;
  products_count?: number;
}

export interface ApiServiceCategory {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  service_count?: number;
}

export interface ApiSupplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  contact_person?: string | null;
  payment_terms_days?: number | null;
  is_active: boolean;
}

export interface ApiMovement {
  id: number;
  product_id: number;
  movement_type: 'MASUK' | 'KELUAR' | 'PENYESUAIAN';
  quantity: number;
  balance_after: number;
  reference_type: string;
  reference_id: string;
  description?: string | null;
  operator_name?: string | null;
  created_at: string;
  product?: { id: number; product_name: string; product_size?: string | null } | null;
}

export interface ApiPurchase {
  id: number;
  purchase_number: string;
  supplier_id: number | null;
  supplier_name: string;
  supplier_invoice?: string | null;
  purchase_date: string;
  payment_method: 'TUNAI' | 'TRANSFER_BCA' | 'TEMPO';
  due_date?: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'LUNAS' | 'BELUM_LUNAS' | 'SEBAGIAN';
  notes?: string | null;
}

export interface InventoryValuation {
  fifo_value: number;
  ledger_balance: number;
  difference: number;
}

// ---------------------------------------------------------------------------
// Respons → tipe UI
// ---------------------------------------------------------------------------

export const mapProductCategory = (c: ApiProductCategory): ProductCategory => ({
  id: String(c.id),
  category_code: c.category_code,
  category_name: c.category_name,
  description: c.description ?? undefined,
  is_active: !!c.is_active,
  product_count: c.products_count ?? 0,
});

export const mapServiceCategory = (c: ApiServiceCategory): ServiceCategoryItem => ({
  id: String(c.id),
  code: c.code,
  name: c.name,
  description: c.description ?? undefined,
  is_active: !!c.is_active,
  service_count: c.service_count ?? 0,
});

export const mapSupplier = (s: ApiSupplier): SupplierItem => ({
  id: String(s.id),
  supplier_code: s.supplier_code,
  supplier_name: s.supplier_name,
  phone: s.phone,
  email: s.email ?? undefined,
  address: s.address ?? '',
  contact_person: s.contact_person ?? '',
  payment_terms_days: Number(s.payment_terms_days) || 0,
  is_active: !!s.is_active,
});

const REFERENCE_LABELS: Record<string, string> = {
  SALE: 'Penjualan kasir',
  SALE_VOID: 'Void nota (stok kembali)',
  GOODS_RECEIPT: 'Penerimaan barang',
  STOCK_OPNAME: 'Stock opname',
  INITIAL_STOCK: 'Stok awal',
};

export const mapMovement = (m: ApiMovement): StockMutation => {
  const name = m.product?.product_name ?? `Produk #${m.product_id}`;
  const label = REFERENCE_LABELS[m.reference_type] ?? m.reference_type;
  return {
    id: String(m.id),
    tire_id: String(m.product_id),
    product_id: String(m.product_id),
    tire_name: name,
    product_name: name,
    tire_size: m.product?.product_size ?? '',
    date: (m.created_at ?? '').replace('T', ' ').slice(0, 19),
    ref_doc: m.reference_id,
    type: m.movement_type,
    qty: Math.abs(Number(m.quantity) || 0),
    balance: Number(m.balance_after) || 0,
    notes: m.description ?? label,
    description: label,
    operator: m.operator_name ?? '-',
  };
};

/** Hanya pembelian TEMPO yang menjadi hutang supplier. */
export const mapPurchaseToPayable = (p: ApiPurchase): PayableInvoice => ({
  id: String(p.id),
  invoice_number: p.supplier_invoice || p.purchase_number,
  supplier_name: p.supplier_name,
  date: p.purchase_date,
  due_date: p.due_date ?? p.purchase_date,
  total_amount: Number(p.total_amount) || 0,
  paid_amount: Number(p.paid_amount) || 0,
  remaining_amount: Number(p.remaining_amount) || 0,
  status: p.status,
  notes: p.notes ?? undefined,
  ref_doc: p.purchase_number,
});

// ---------------------------------------------------------------------------
// Form UI → payload server
// ---------------------------------------------------------------------------

export interface ProductPayload {
  product_name: string;
  product_code?: string;
  barcode?: string;
  brand: string;
  category_id?: number;
  size_width?: number;
  size_ratio?: number;
  ring?: string;
  product_size?: string;
  motif?: string;
  product_year?: string;
  product_cost: number;
  product_price: number;
  product_stock_alert: number;
  is_active?: boolean;
  initial_batch?: { source_name: string; batch_cost: number; initial_qty: number };
}

const categoryIdFor = (code: string | undefined, categories: ProductCategory[]): number | undefined => {
  const found = categories.find((c) => c.category_code === code);
  const id = Number(found?.id);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const sizeLabel = (width?: number, ratio?: string | number, ring?: string): string | undefined => {
  if (width && ratio && ring) return `${width}/${ratio} ${ring}`;
  return ring || undefined;
};

export const productPayload = (
  input: CreateProductInput | UpdateProductInput,
  categories: ProductCategory[],
  existing?: { product_name: string; brand: string; product_cost: number; product_price: number; product_stock_alert: number }
): ProductPayload => {
  const ratio = input.size_ratio !== undefined && input.size_ratio !== '' ? Number(input.size_ratio) : undefined;
  const payload: ProductPayload = {
    product_name: (input.product_name ?? existing?.product_name ?? '').trim(),
    product_code: input.product_code?.trim() || undefined,
    barcode: input.barcode?.trim() || undefined,
    brand: input.brand ?? existing?.brand ?? '-',
    category_id: categoryIdFor(input.category, categories),
    size_width: input.size_width || undefined,
    size_ratio: Number.isFinite(ratio) ? ratio : undefined,
    ring: input.ring || undefined,
    product_size: sizeLabel(input.size_width, input.size_ratio, input.ring),
    motif: input.motif || undefined,
    product_year: input.product_year !== undefined ? String(input.product_year) : undefined,
    product_cost: input.product_cost ?? existing?.product_cost ?? 0,
    product_price: input.product_price ?? existing?.product_price ?? 0,
    product_stock_alert: input.product_stock_alert ?? existing?.product_stock_alert ?? 5,
  };
  if ('is_active' in input && input.is_active !== undefined) payload.is_active = input.is_active;

  const create = input as CreateProductInput;
  if (create.initial_stock && create.initial_stock > 0) {
    payload.initial_batch = {
      source_name: create.supplier_name?.trim() || 'Stok awal gudang',
      batch_cost: create.product_cost,
      initial_qty: create.initial_stock,
    };
  }
  return payload;
};

export interface RestockPayload {
  product_id: number;
  quantity: number;
  batch_cost: number;
  supplier_id?: number;
  source_name: string;
  supplier_invoice?: string;
  purchase_date?: string;
  payment_method: 'TUNAI' | 'TRANSFER_BCA' | 'TEMPO';
  due_date?: string;
  notes?: string;
}

const PAYMENT_TERMS: Record<string, RestockPayload['payment_method']> = {
  TUNAI_KAS: 'TUNAI',
  TUNAI_BANK: 'TRANSFER_BCA',
  TEMPO_HUTANG: 'TEMPO',
};

export const restockPayload = (input: GoodsReceiptInput, suppliers: SupplierItem[]): RestockPayload => {
  const supplier = suppliers.find((s) => s.supplier_name === input.supplier_name);
  const method = PAYMENT_TERMS[input.payment_terms ?? 'TEMPO_HUTANG'] ?? 'TEMPO';
  const supplierId = Number(supplier?.id);
  return {
    product_id: Number(input.product_id),
    quantity: input.incoming_qty,
    batch_cost: input.unit_cost,
    supplier_id: Number.isInteger(supplierId) && supplierId > 0 ? supplierId : undefined,
    source_name: input.supplier_name,
    supplier_invoice: input.supplier_invoice || undefined,
    purchase_date: input.receipt_date || undefined,
    payment_method: method,
    due_date: method === 'TEMPO' ? input.due_date || undefined : undefined,
    notes: input.notes || undefined,
  };
};

export const debtPaymentPayload = (input: DebtPaymentInput) => ({
  amount: input.amount,
  account_code: input.source_account_code,
  payment_date: input.payment_date,
  notes: input.notes,
});
