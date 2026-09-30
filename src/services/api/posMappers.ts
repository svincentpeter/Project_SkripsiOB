import {
  CartItem,
  JournalEntry,
  PaymentMethod,
  PaymentProviderSetting,
  PosTransaction,
  ProductItem,
  ServiceMasterItem,
  SplitPaymentLine,
} from '../../shared/types';

// ---------------------------------------------------------------------------
// Bentuk respons server (lihat Sale::toReceiptArray, JournalEntry::toApiArray)
// ---------------------------------------------------------------------------

export interface ApiJournal {
  id?: number;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_id: string;
  description: string;
  total_debit: number;
  total_credit: number;
  reversal_of?: string | null;
  reversed_by?: string | null;
  can_reverse?: boolean;
  created_by_name?: string | null;
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
  net_received: number;
  provider_name?: string | null;
  reference?: string | null;
}

/** Setiap nota lunas saat checkout (LUNAS) atau dibatalkan (VOID). */
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
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: string;
  payment_provider?: string | null;
  fee_amount: number;
  net_received: number;
  total_hpp: number;
  total_profit: number;
  notes?: string | null;
  status: 'LUNAS' | 'VOID';
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
  items: ApiSaleItem[];
  payments: ApiSalePayment[];
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

/** Fee MDR dan nama provider dihitung server dari provider_id (payment_provider_settings); klien tidak mengirimnya. */
export interface PaymentPayload {
  method: 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS';
  amount: number;
  tendered?: number;
  provider_id?: number;
  reference?: string;
}

export interface CheckoutPayload {
  customer_name?: string;
  customer_phone?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  notes?: string;
  discount_amount: number;
  items: CartLinePayload[];
  payments: PaymentPayload[];
}

/** Data pembayaran yang dikumpulkan CheckoutModal. */
export interface CheckoutPaymentMeta {
  provider_id?: number;
  split_payments?: SplitPaymentLine[];
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

/**
 * Susun baris pembayaran dari hasil CheckoutModal. Klien hanya menyebut provider (provider_id);
 * persentase dan nominal fee MDR dihitung server dari pengaturan provider yang sama.
 */
export const buildPayments = (
  method: PaymentMethod,
  amountDue: number,
  cashTendered: number,
  meta: CheckoutPaymentMeta = {}
): PaymentPayload[] => {
  if (meta.split_payments && meta.split_payments.length > 0) {
    const rows = meta.split_payments.map((row): PaymentPayload => {
      const m = row.method as PaymentPayload['method'];
      return {
        method: m,
        amount: num(row.amount),
        tendered: m === 'TUNAI' ? num(row.amount) : undefined,
        provider_id: m === 'TUNAI' ? undefined : row.provider_id,
      };
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

  // Penjualan Rp 0 tidak punya baris pembayaran (server menolak amount < 0,01).
  if (amountDue <= 0) return [];

  const m = method as PaymentPayload['method'];
  return [
    {
      method: m,
      amount: amountDue,
      tendered: m === 'TUNAI' ? cashTendered : undefined,
      provider_id: m === 'TUNAI' ? undefined : meta.provider_id,
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
  reference_type: j.reference_type,
  can_reverse: j.can_reverse ?? false,
  reversed_by: j.reversed_by ?? null,
  reversal_of: j.reversal_of ?? null,
  created_by_name: j.created_by_name ?? null,
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
    grand_total: num(s.total_amount),
    total_amount: num(s.total_amount),
    total_cost_hpp: num(s.total_hpp),
    total_hpp: num(s.total_hpp),
    gross_profit: num(s.total_profit),
    total_profit: num(s.total_profit),
    payment_method: s.payment_method as PaymentMethod,
    split_payments: isSplit
      ? s.payments.map((p, i) => ({
          id: `${s.id}-${i}`,
          method: p.method as PaymentMethod,
          amount: num(p.amount),
          provider_name: p.provider_name ?? undefined,
          fee_percentage: num(p.fee_percentage),
          fee_amount: num(p.fee_amount),
          net_received: num(p.net_received),
        }))
      : undefined,
    amount_paid: num(s.paid_amount) + num(s.change_amount),
    paid_amount: num(s.paid_amount) + num(s.change_amount),
    change_amount: num(s.change_amount),
    payment_provider: s.payment_provider ?? undefined,
    fee_amount: num(s.fee_amount),
    net_received: num(s.net_received),
    notes: s.notes ?? undefined,
    status: s.status,
    stock_deducted: true,
    is_voided: s.status === 'VOID',
    void_reason: s.void_reason ?? undefined,
    voided_at: s.voided_at ?? undefined,
    voided_by: s.voided_by ?? undefined,
  };
};


// ---------------------------------------------------------------------------
// Provider pembayaran (payment_provider_settings)
// ---------------------------------------------------------------------------

/** Baris payment_provider_settings dari server; kolom desimal datang sebagai string ("0.30"). */
export interface ApiPaymentProvider {
  id: number;
  method_type: 'bank' | 'qris';
  provider_name: string;
  provider_code?: string | null;
  fee_percentage: number | string;
  fee_threshold_amount: number | string;
  is_active: boolean;
}

export const mapPaymentProvider = (p: ApiPaymentProvider): PaymentProviderSetting => ({
  id: p.id,
  method_type: p.method_type,
  provider_name: p.provider_name,
  provider_code: p.provider_code ?? undefined,
  fee_percentage: num(p.fee_percentage),
  fee_threshold_amount: num(p.fee_threshold_amount),
  is_active: !!p.is_active,
});

/** Id provider server untuk nama pilihan kasir; QRIS jatuh ke provider pertama, sama seperti hitungan fee. */
export const providerIdOf = (
  options: PaymentProviderSetting[],
  name?: string,
  fallbackToFirst = false
): number | undefined => {
  const found = options.find((o) => o.provider_name === name) ?? (fallbackToFirst ? options[0] : undefined);
  return found ? Number(found.id) : undefined;
};
