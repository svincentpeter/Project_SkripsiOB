import {
  CartItem,
  JournalEntry,
  PaymentMethod,
  PosTransaction,
  ProductItem,
  ReceivableInvoice,
  SalesBookingRecord,
  ServiceMasterItem,
  SplitPaymentLine,
} from '../../shared/types';

// ---------------------------------------------------------------------------
// Bentuk respons server (lihat Sale::toReceiptArray, JournalEntry::toApiArray)
// ---------------------------------------------------------------------------

export interface ApiJournal {
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_id: string;
  description: string;
  total_debit: number;
  total_credit: number;
  lines: { account_code: string; account_name: string; debit: number; credit: number; note?: string | null }[];
}

export interface ApiSaleItem {
  id: number;
  item_type: 'PRODUCT' | 'SERVICE';
  item_name: string;
  product_id: number | null;
  service_id: number | null;
  is_manual: boolean;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  sub_total: number;
  unit_cost_hpp: number;
  total_cost_hpp: number;
  product: { id: number; product_name: string; brand?: string; product_size?: string; motif?: string } | null;
}

export interface ApiSalePayment {
  method: string;
  account_code: string;
  amount: number;
  tendered_amount: number;
  change_amount: number;
  fee_percentage: number;
  fee_amount: number;
  surcharge_amount: number;
  net_received: number;
  provider_name?: string | null;
  edc_bank?: string | null;
  edc_type?: 'Debit' | 'Credit' | null;
  reference?: string | null;
}

export interface ApiSale {
  id: number;
  reference: string;
  date: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string | null;
  vehicle_plate: string;
  vehicle_model?: string | null;
  cashier_name: string;
  gross_sales_amount: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  dp_applied: number;
  payment_method: string;
  payment_provider?: string | null;
  edc_bank?: string | null;
  edc_type?: 'Debit' | 'Credit' | null;
  fee_amount: number;
  surcharge_amount: number;
  net_received: number;
  total_hpp: number;
  total_profit: number;
  notes?: string | null;
  status: 'LUNAS' | 'PENDING' | 'VOID';
  due_date?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
  items: ApiSaleItem[];
  payments: ApiSalePayment[];
  journals: ApiJournal[];
}

export interface ApiReceivable {
  sale_id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string | null;
  vehicle_plate?: string | null;
  date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
  notes?: string | null;
}

export interface ApiBookingItem {
  type: 'PRODUCT' | 'SERVICE';
  product_id: number | null;
  service_id: number | null;
  name: string;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  is_manual: boolean;
  cost_price: number;
}

export interface ApiBooking {
  id: number;
  booking_number: string;
  date: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  vehicle_plate: string;
  vehicle_model?: string | null;
  items: ApiBookingItem[];
  estimated_total: number;
  dp_amount: number;
  remaining_amount: number;
  payment_method: string;
  notes?: string | null;
  status: SalesBookingRecord['status'];
  journals: ApiJournal[];
}

// ---------------------------------------------------------------------------
// Payload ke server
// ---------------------------------------------------------------------------

export interface CartLinePayload {
  type: 'PRODUCT' | 'SERVICE';
  product_id?: number;
  service_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  is_manual: boolean;
  cost_price?: number;
}

export interface PaymentPayload {
  method: 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS' | 'EDC_DEBIT' | 'EDC_CREDIT';
  amount: number;
  tendered?: number;
  fee_percentage?: number;
  charge_to_customer?: boolean;
  provider_name?: string;
  edc_bank?: string;
  edc_type?: 'Debit' | 'Credit';
  reference?: string;
}

export interface CheckoutPayload {
  customer_name?: string;
  customer_phone?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  notes?: string;
  tax_rate: 0 | 11;
  discount_amount: number;
  booking_id?: number;
  bon?: { term_days: 7 | 14 | 30 };
  items: CartLinePayload[];
  payments: PaymentPayload[];
}

/** Data pembayaran yang dikumpulkan CheckoutModal. */
export interface CheckoutPaymentMeta {
  provider_name?: string;
  edc_bank?: string;
  edc_type?: 'Debit' | 'Credit';
  fee_percentage?: number;
  fee_amount?: number;
  surcharge_amount?: number;
  split_payments?: SplitPaymentLine[];
  term_days?: number;
  reference?: string;
}

const num = (v: unknown): number => Number(v) || 0;

/** Id numerik katalog server; id lokal/manual ("manual-…", "svc-…") bukan id server. */
const serverId = (id: string | number | undefined): number | undefined => {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Produk sintetis untuk baris jasa agar komponen UI lama tetap aman; tidak pernah dikirim sebagai product_id. */
export const serviceCartProduct = (service: ServiceMasterItem): ProductItem =>
  ({
    id: `svc-${service.id}`,
    name: service.service_name,
    product_name: service.service_name,
    category: 'SERVICES',
    price: service.standard_price,
    product_price: service.standard_price,
    cost: service.cost_price,
    product_cost: service.cost_price,
    stock: 999,
    product_quantity: 999,
  }) as ProductItem;

export const cartLineToPayload = (item: CartItem): CartLinePayload => {
  const isService = item.item_type === 'SERVICE';
  const isManual = !!item.is_manual;
  const unitPrice =
    item.custom_price ??
    (isService ? item.service?.standard_price : item.product.product_price ?? item.product.price) ??
    0;
  const name =
    item.custom_name_override ||
    (isService ? item.service?.service_name : item.product.product_name || item.product.name) ||
    'Item';

  return {
    type: isService ? 'SERVICE' : 'PRODUCT',
    product_id: !isService && !isManual ? serverId(item.product.id) : undefined,
    service_id: isService && !isManual ? serverId(item.service?.id) : undefined,
    name,
    quantity: item.qty,
    unit_price: unitPrice,
    discount_per_item: item.discount_per_item ?? 0,
    is_manual: isManual,
    cost_price: isManual ? item.custom_hpp ?? 0 : undefined,
  };
};

const normalizeMethod = (method: PaymentMethod | string, edcType?: 'Debit' | 'Credit'): PaymentPayload['method'] => {
  if (method === 'EDC') return edcType === 'Credit' ? 'EDC_CREDIT' : 'EDC_DEBIT';
  return method as PaymentPayload['method'];
};

/**
 * Susun baris pembayaran dari hasil CheckoutModal. Persentase fee hanya dikirim bila
 * modal memang membebankan fee (mis. QRIS di atas ambang), sehingga server menghitung nominal yang sama.
 */
export const buildPayments = (
  method: PaymentMethod,
  amountDue: number,
  cashTendered: number,
  meta: CheckoutPaymentMeta = {}
): PaymentPayload[] => {
  if (meta.split_payments && meta.split_payments.length > 0) {
    const rows = meta.split_payments.map((row) => {
      const m = normalizeMethod(row.method, row.edc_type);
      const hasFee = num(row.fee_amount) > 0 || num(row.surcharge_amount) > 0;
      return {
        method: m,
        amount: num(row.amount),
        tendered: m === 'TUNAI' ? num(row.amount) : undefined,
        fee_percentage: hasFee ? num(row.fee_percentage) : 0,
        charge_to_customer: m === 'EDC_CREDIT' && num(row.surcharge_amount) > 0,
        provider_name: row.provider_name,
        edc_bank: row.edc_bank,
        edc_type: row.edc_type,
      } as PaymentPayload;
    });

    // Kelebihan bayar menjadi kembalian dari baris tunai pertama.
    let overpay = rows.reduce((s, r) => s + r.amount, 0) - amountDue;
    for (const row of rows) {
      if (overpay <= 0) break;
      if (row.method === 'TUNAI') {
        const cut = Math.min(overpay, row.amount);
        row.amount -= cut;
        overpay -= cut;
      }
    }
    return rows.filter((r) => r.amount > 0);
  }

  const m = normalizeMethod(method, meta.edc_type);
  const hasFee = num(meta.fee_amount) > 0 || num(meta.surcharge_amount) > 0;
  return [
    {
      method: m,
      amount: amountDue,
      tendered: m === 'TUNAI' ? cashTendered : undefined,
      fee_percentage: hasFee ? num(meta.fee_percentage) : 0,
      charge_to_customer: m === 'EDC_CREDIT' && num(meta.surcharge_amount) > 0,
      provider_name: meta.provider_name,
      edc_bank: meta.edc_bank,
      edc_type: meta.edc_type,
      reference: meta.reference,
    },
  ];
};

// ---------------------------------------------------------------------------
// Respons server → tipe UI
// ---------------------------------------------------------------------------

export const mapJournal = (j: ApiJournal): JournalEntry => ({
  id: j.entry_number,
  journal_number: j.entry_number,
  reference_number: j.reference_id,
  date: j.entry_date,
  ref_doc: j.reference_id,
  description: j.description,
  status: 'POSTED',
  total_debit: num(j.total_debit),
  total_credit: num(j.total_credit),
  lines: j.lines.map((l) => ({
    account_code: l.account_code,
    account_name: l.account_name,
    debit: num(l.debit),
    credit: num(l.credit),
    note: l.note ?? undefined,
  })),
});

const saleItemToCart = (it: ApiSaleItem): CartItem => {
  const product = {
    id: it.product_id ? String(it.product_id) : `line-${it.id}`,
    name: it.item_name,
    product_name: it.item_name,
    brand: it.product?.brand ?? '',
    product_size: it.product?.product_size,
    motif: it.product?.motif,
    price: num(it.unit_price),
    product_price: num(it.unit_price),
    category: it.item_type === 'SERVICE' ? 'SERVICES' : 'BAN_BARU',
  } as ProductItem;

  return {
    item_type: it.item_type,
    product,
    service:
      it.item_type === 'SERVICE'
        ? ({
            id: it.service_id ? String(it.service_id) : `line-${it.id}`,
            service_code: '',
            service_name: it.item_name,
            category: 'JASA_MANUAL',
            standard_price: num(it.unit_price),
            cost_price: num(it.unit_cost_hpp),
            is_active: true,
          } as ServiceMasterItem)
        : undefined,
    qty: it.quantity,
    discount_per_item: num(it.discount_per_item),
    custom_price: num(it.unit_price),
    custom_hpp: num(it.unit_cost_hpp),
    custom_name_override: it.item_name,
    is_manual: it.is_manual,
  };
};

export const mapSaleToTransaction = (s: ApiSale): PosTransaction => {
  const isBon = s.payment_method === 'BON';
  const isSplit = s.payments.length > 1;
  const lineDiscounts = s.items.reduce((sum, it) => sum + num(it.discount_per_item) * it.quantity, 0);
  const subtotal = num(s.gross_sales_amount) - lineDiscounts;
  const notaDiscount = num(s.discount_amount) - lineDiscounts;
  const time = s.created_at ? new Date(s.created_at).toTimeString().slice(0, 5) : '';

  return {
    id: String(s.id),
    reference: s.reference,
    invoice_number: s.reference,
    date: s.date,
    timestamp: time,
    cashier_name: s.cashier_name,
    customer_name: s.customer_name,
    customer_phone: s.customer_phone ?? undefined,
    vehicle_plate: s.vehicle_plate,
    vehicle_model: s.vehicle_model ?? undefined,
    items: s.items.map(saleItemToCart),
    subtotal,
    gross_sales_amount: subtotal,
    total_discount: notaDiscount,
    discount_amount: notaDiscount,
    tax_amount: num(s.tax_amount),
    tax_rate: num(s.tax_percentage),
    tax_percentage: num(s.tax_percentage),
    grand_total: num(s.total_amount),
    total_amount: num(s.total_amount),
    total_cost_hpp: num(s.total_hpp),
    total_hpp: num(s.total_hpp),
    gross_profit: num(s.total_profit),
    total_profit: num(s.total_profit),
    payment_method: (isBon ? 'HUTANG_BON' : s.payment_method) as PaymentMethod,
    split_payments: isSplit
      ? s.payments.map((p, i) => ({
          id: `${s.id}-${i}`,
          method: p.method as PaymentMethod,
          amount: num(p.amount),
          provider_name: p.provider_name ?? undefined,
          edc_bank: p.edc_bank ?? undefined,
          edc_type: p.edc_type ?? undefined,
          fee_percentage: num(p.fee_percentage),
          fee_amount: num(p.fee_amount),
          surcharge_amount: num(p.surcharge_amount),
          net_received: num(p.net_received),
        }))
      : undefined,
    amount_paid: num(s.paid_amount) + num(s.change_amount),
    paid_amount: num(s.paid_amount) + num(s.change_amount),
    change_amount: num(s.change_amount),
    payment_provider: s.payment_provider ?? undefined,
    edc_bank: s.edc_bank ?? undefined,
    edc_type: s.edc_type ?? undefined,
    fee_amount: num(s.fee_amount),
    surcharge_amount: num(s.surcharge_amount),
    net_received: num(s.net_received),
    notes: s.notes ?? undefined,
    status: s.status,
    stock_deducted: true,
    is_bon: isBon,
    dp_applied: num(s.dp_applied),
    due_date: s.due_date ?? undefined,
    is_voided: s.status === 'VOID',
    void_reason: s.void_reason ?? undefined,
    voided_at: s.voided_at ?? undefined,
    voided_by: s.voided_by ?? undefined,
  };
};

export const mapReceivable = (r: ApiReceivable): ReceivableInvoice => ({
  id: String(r.sale_id),
  invoice_number: r.invoice_number,
  customer_name: r.customer_name,
  customer_phone: r.customer_phone ?? undefined,
  vehicle_plate: r.vehicle_plate ?? undefined,
  date: r.date,
  due_date: r.due_date,
  total_amount: num(r.total_amount),
  paid_amount: num(r.paid_amount),
  remaining_amount: num(r.remaining_amount),
  status: r.status,
  notes: r.notes ?? undefined,
});

/**
 * Booking → record UI. Baris produk katalog memakai ProductItem terkini agar batas stok & HPP di keranjang benar.
 */
export const mapBooking = (
  b: ApiBooking,
  products: ProductItem[],
  services: ServiceMasterItem[]
): SalesBookingRecord => ({
  id: String(b.id),
  booking_number: b.booking_number,
  date: b.date,
  customer_name: b.customer_name,
  customer_phone: b.customer_phone,
  vehicle_plate: b.vehicle_plate,
  vehicle_model: b.vehicle_model ?? '',
  items: b.items.map((it): CartItem => {
    const catalogProduct = it.product_id ? products.find((p) => String(p.id) === String(it.product_id)) : undefined;
    const catalogService = it.service_id ? services.find((s) => String(s.id) === String(it.service_id)) : undefined;
    const service =
      it.type === 'SERVICE'
        ? catalogService ??
          ({
            id: `manual-bk-${b.id}-${it.name}`,
            service_code: '',
            service_name: it.name,
            category: 'JASA_MANUAL',
            standard_price: num(it.unit_price),
            cost_price: num(it.cost_price),
            is_active: true,
          } as ServiceMasterItem)
        : undefined;
    const product =
      catalogProduct ??
      (service
        ? serviceCartProduct(service)
        : ({
            id: `manual-bk-${b.id}-${it.name}`,
            name: it.name,
            product_name: it.name,
            price: num(it.unit_price),
            product_price: num(it.unit_price),
            stock: 999,
            product_quantity: 999,
          } as ProductItem));

    return {
      item_type: it.type,
      product,
      service,
      qty: it.quantity,
      discount_per_item: num(it.discount_per_item),
      custom_price: num(it.unit_price),
      custom_hpp: it.is_manual ? num(it.cost_price) : undefined,
      custom_name_override: it.is_manual ? it.name : undefined,
      is_manual: it.is_manual,
    };
  }),
  estimated_total: num(b.estimated_total),
  dp_amount: num(b.dp_amount),
  remaining_amount: num(b.remaining_amount),
  payment_method: b.payment_method as PaymentMethod,
  notes: b.notes ?? undefined,
  status: b.status,
  created_at: b.created_at,
});
