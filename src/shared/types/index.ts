export type TireBrand = 'Bridgestone' | 'Accelera' | 'Dunlop' | 'Forceum' | 'Hankook' | 'GTRadial';
export type TireRing = 'R13' | 'R14' | 'R15' | 'R16' | 'R17' | 'R18+';

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_code: string; // e.g. "BATCH-2026-08-01"
  source_name: string; // e.g. "PT Bridgestone Tire Indonesia"
  batch_cost: number; // HPP spesifik layer
  initial_qty: number;
  remaining_qty: number;
  purchase_date: string;
}

export interface TireProduct {
  id: string;
  category_id?: number;
  brand_id?: number;
  brand: TireBrand;
  product_name: string; // Nama ban resmi
  name: string; // Alias kompatibilitas
  product_code: string; // SKU Kode Unik: e.g. "BRI-1856515-TUR"
  barcode: string;
  product_size: string; // e.g. "185/65 R15"
  size_width: number; // 185
  size_ratio: string; // "65"
  ring: TireRing;
  motif: string; // Pola kembangan tapak ban
  pattern: string; // Alias kompatibilitas
  product_year: number | string; // Tahun produksi DOT (misal: 2024, 2025)
  condition_code: 'BARU'; // Fokus Cabang 3: Ban Baru
  product_quantity: number; // Stok gudang riil
  stock: number; // Alias kompatibilitas
  product_stock_alert: number; // Batas minimum stok peringatan
  min_stock: number; // Alias kompatibilitas
  product_cost: number; // HPP per unit
  cost_price: number; // Alias kompatibilitas
  cost?: number; // Alias kompatibilitas
  product_price: number; // Harga jual retail
  price?: number; // Alias kompatibilitas
  size?: string; // Alias kompatibilitas
  is_active?: boolean;
  is_old_stock?: boolean;
  image_placeholder_color: string;
  batches?: ProductBatch[]; // Layer FIFO
}

export interface CartItem {
  product: TireProduct;
  qty: number;
  discount_per_item: number;
  custom_price?: number; // Override price with supervisor approval
  override_reason?: string;
  adjusted_by?: string;
}

export type PaymentMethod = 'TUNAI' | 'TRANSFER_BCA' | 'QRIS' | 'EDC_DEBIT' | 'EDC_CREDIT';

export interface PosTransaction {
  id: string;
  reference: string; // "OB3-INV-202609-0142"
  invoice_number: string; // Alias kompatibilitas
  date: string;
  timestamp: string;
  cashier_name: string;
  customer_name: string;
  vehicle_plate: string; // Plat nomor dan jenis kendaraan
  items: CartItem[];
  subtotal: number;
  gross_sales_amount: number;
  total_discount: number;
  discount_amount: number;
  tax_amount: number; // PPN 11%
  tax_rate: number;
  tax_percentage: number;
  grand_total: number;
  total_amount: number;
  total_cost_hpp: number; // Total HPP FIFO
  total_hpp: number;
  gross_profit: number; // Omzet - HPP
  total_profit: number;
  payment_method: PaymentMethod;
  amount_paid: number;
  paid_amount: number;
  change_amount: number;
  payment_reference?: string;
  notes?: string;
  status: 'LUNAS' | 'VOID' | 'PENDING' | 'Completed';
  stock_deducted: boolean;
  is_voided?: boolean;
  void_reason?: string;
}

export interface StockMutation {
  id: string;
  tire_id: string;
  product_id?: string;
  tire_name: string;
  product_name?: string;
  tire_size: string;
  date: string;
  ref_doc: string; // "OB3-INV-0142" / "PO-SUP-889"
  type: 'MASUK' | 'KELUAR' | 'PENYESUAIAN';
  qty: number;
  balance: number;
  notes: string;
  description?: string;
  operator: string;
}

export interface StockOpnameItem {
  tire_id: string;
  tire_name: string;
  product_size: string;
  system_stock: number;
  physical_stock: number;
  difference: number;
  cost_price: number;
  total_difference_val: number;
}

export type ExpenseCategory = 
  | 'Listrik & Air (PLN/PDAM)'
  | 'Gaji & Uang Makan Montir'
  | 'Sewa Lahan & Bangunan'
  | 'Transport & Pengiriman Ban'
  | 'ATK & Keperluan Bengkel'
  | 'Pemeliharaan Mesin Spooring & Balancing'
  | 'Konsumsi & Lembur Karyawan'
  | 'Pajak & Retribusi Daerah';

export type CashSource = 'Kas Tunai Laci Kasir' | 'Rekening Bank BCA (Cabang 3)';

export interface ExpenseRecord {
  id: string;
  reference: string;
  expense_number: string; // e.g. "BIAYA-OB3-202609-001"
  date: string;
  category: ExpenseCategory;
  category_id?: number;
  amount: number;
  cash_source: CashSource;
  payment_method?: string;
  bank_name?: string;
  paid_to: string;
  description: string;
  receipt_image?: string; // base64 or preview
  attachment_path?: string;
  approved_by: string;
  journal_id?: string;
  created_at: string;
}

export interface JournalLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  journal_number: string; // "JU-202609-0001"
  reference_number: string;
  date: string;
  ref_doc: string;
  description: string;
  lines: JournalLine[];
  status: 'POSTED' | 'VOID';
  total_debit?: number;
  total_credit?: number;
}

export type ActiveScreen = 
  | 'pos'
  | 'receipt'
  | 'dashboard'
  | 'inventory'
  | 'expenses'
  | 'ledger'
  | 'financials';

export interface CreateProductInput {
  brand: TireBrand;
  product_name: string;
  product_code?: string;
  barcode?: string;
  size_width: number;
  size_ratio: string;
  ring: TireRing;
  motif: string;
  product_year: number | string;
  product_cost: number;
  product_price: number;
  product_stock_alert: number;
  initial_stock?: number;
  supplier_name?: string;
}

export interface UpdateProductInput {
  brand?: TireBrand;
  product_name?: string;
  product_code?: string;
  barcode?: string;
  size_width?: number;
  size_ratio?: string;
  ring?: TireRing;
  motif?: string;
  product_year?: number | string;
  product_cost?: number;
  product_price?: number;
  product_stock_alert?: number;
  is_active?: boolean;
}

export type PaymentTerms = 'TUNAI_KAS' | 'TUNAI_BANK' | 'TEMPO_HUTANG';

export interface GoodsReceiptInput {
  product_id: string;
  incoming_qty: number;
  unit_cost: number;
  supplier_name: string;
  supplier_invoice?: string;
  receipt_date?: string;
  payment_terms?: PaymentTerms;
  due_date?: string;
  notes?: string;
  operator?: string;
}

export interface PayableInvoice {
  id: string;
  invoice_number: string; // e.g. "INV-BS-202608-01"
  supplier_name: string; // e.g. "PT Bridgestone Tire Indonesia"
  date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
  notes?: string;
  ref_doc?: string;
}

export interface DebtPaymentInput {
  payable_invoice_id: string;
  payment_date: string;
  amount: number;
  source_account_code: '1-1000' | '1-1001';
  notes?: string;
  operator?: string;
}

export interface ManualJournalInput {
  date: string;
  ref_doc: string;
  description: string;
  lines: {
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
    note?: string;
  }[];
}

export interface ChartOfAccount {
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normal_balance: 'DEBIT' | 'CREDIT';
  category_name?: string;
}

export interface LedgerTransaction {
  id: string;
  journal_id: string;
  journal_number: string;
  date: string;
  ref_doc: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  note?: string;
}

export interface LedgerAccountSummary {
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normal_balance: 'DEBIT' | 'CREDIT';
  initial_balance: number;
  total_debit: number;
  total_credit: number;
  ending_balance: number;
  transactions: LedgerTransaction[];
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  debit_balance: number;
  credit_balance: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  difference: number;
}

