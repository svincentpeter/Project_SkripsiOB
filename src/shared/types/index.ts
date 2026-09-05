export type ItemCategory = 'BAN_BARU' | 'VELG' | 'BAN_DALAM';
export type TireBrand = 'Bridgestone' | 'Accelera' | 'Dunlop' | 'Forceum' | 'Hankook' | 'GTRadial' | 'HSR' | 'Enkei' | 'Rays' | 'Swallow' | 'Kingland' | string;
export type TireRing = 'R13' | 'R14' | 'R15' | 'R16' | 'R17' | 'R18' | 'R19' | 'R20+' | string;

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_code: string;
  source_name: string;
  batch_cost: number;
  initial_qty: number;
  remaining_qty: number;
  purchase_date: string;
}

export interface ProductItem {
  id: string;
  category: ItemCategory;
  category_id?: number;
  brand_id?: number;
  brand: string;
  product_name: string;
  name: string;
  product_code: string;
  barcode: string;
  
  product_size?: string;
  size_width?: number;
  size_ratio?: string;
  ring?: string;
  motif?: string;
  pattern?: string;
  product_year?: number | string;
  condition_code: 'BARU';
  
  pcd?: string;
  rim_width?: number;
  offset_et?: number;
  color_finish?: string;
  
  valve_type?: string;
  
  product_quantity: number;
  stock: number;
  product_stock_alert: number;
  min_stock: number;
  product_cost: number;
  cost_price: number;
  cost?: number;
  product_price: number;
  price?: number;
  size?: string;
  is_active?: boolean;
  is_old_stock?: boolean;
  image_placeholder_color?: string;
  batches?: ProductBatch[];
}

export type TireProduct = ProductItem;

export type ServiceCategory = 'SPOORING' | 'BALANCING' | 'BONGKAR_PASANG' | 'PERBAIKAN_BAN' | 'NITROGEN';

export interface ServiceMasterItem {
  id: string;
  service_code: string;
  service_name: string;
  category: ServiceCategory;
  standard_price: number;
  cost_price: number;
  description?: string;
  is_active: boolean;
}

export interface SupplierItem {
  id: string;
  supplier_code: string;
  supplier_name: string;
  phone: string;
  email?: string;
  address: string;
  contact_person: string;
  payment_terms_days: number;
  is_active: boolean;
}

export interface CartItem {
  item_type?: 'PRODUCT' | 'SERVICE';
  product: ProductItem;
  service?: ServiceMasterItem;
  qty: number;
  discount_per_item: number;
  custom_price?: number;
  custom_name_override?: string;
  note?: string;
  override_reason?: string;
  adjusted_by?: string;
}

export interface SalesBookingRecord {
  id: string;
  booking_number: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  vehicle_plate: string;
  vehicle_model: string;
  items: CartItem[];
  estimated_total: number;
  dp_amount: number;
  remaining_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  status: 'ACTIVE' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  created_at: string;
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

export type ExpenseStatus = 'ACTIVE' | 'VOID';

export interface ExpenseRecord {
  id: string;
  reference: string;
  expense_number: string; // e.g. "BKK-202609-0001"
  bkk_number?: string;
  date: string;
  category: ExpenseCategory;
  category_id?: number;
  category_code?: string; // e.g. "6-1001"
  amount: number;
  cash_source: CashSource;
  payment_method?: string;
  bank_name?: string;
  paid_to: string;
  description: string;
  receipt_image?: string; // compressed base64 (< 150KB)
  attachment_path?: string;
  approved_by: string;
  journal_id?: string;
  status?: ExpenseStatus; // 'ACTIVE' | 'VOID', defaults to 'ACTIVE'
  void_reason?: string;
  voided_at?: string;
  voided_by?: string;
  reversal_journal_id?: string;
  created_at: string;
}

export interface ExpenseCategoryMapping {
  category: ExpenseCategory;
  account_code: string;
  account_name: string;
  description: string;
  budget_monthly_limit?: number;
  default_cash_source?: CashSource;
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
  | 'financials'
  | 'settings';

export interface StoreSettings {
  store_name: string;
  branch_name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  
  invoice_header: string;
  invoice_footer_title: string;
  invoice_footer_notes: string;
  invoice_warranty_text: string;
  show_barcode_on_receipt: boolean;
  show_cashier_name: boolean;
  show_vehicle_info: boolean;
  paper_width_mm: number;
  
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  qris_merchant_name: string;
  qris_nmid: string;
  
  default_tax_rate: number;
  default_payment_terms_days: number;
}

export interface CreateProductInput {
  category: ItemCategory;
  brand: string;
  product_name: string;
  product_code?: string;
  barcode?: string;
  
  size_width?: number;
  size_ratio?: string;
  ring?: string;
  motif?: string;
  product_year?: number | string;
  
  pcd?: string;
  rim_width?: number;
  offset_et?: number;
  color_finish?: string;
  
  valve_type?: string;
  
  product_cost: number;
  product_price: number;
  product_stock_alert: number;
  initial_stock?: number;
  supplier_name?: string;
}

export interface UpdateProductInput {
  category?: ItemCategory;
  brand?: string;
  product_name?: string;
  product_code?: string;
  barcode?: string;
  
  size_width?: number;
  size_ratio?: string;
  ring?: string;
  motif?: string;
  product_year?: number | string;
  
  pcd?: string;
  rim_width?: number;
  offset_et?: number;
  color_finish?: string;
  
  valve_type?: string;
  
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

export interface ReceivableInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  vehicle_plate?: string;
  date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
  notes?: string;
}

export interface ReceivablePaymentInput {
  receivable_invoice_id: string;
  payment_date: string;
  amount: number;
  destination_account_code: '1-1000' | '1-1001';
  notes?: string;
  operator?: string;
}

export interface AccountingPeriodInfo {
  period_id: string;
  period_name: string;
  status: 'OPEN' | 'CLOSED';
  closed_at?: string;
  closed_by?: string;
  closing_journal_id?: string;
  net_income_transferred?: number;
}

export interface CashFlowStatementResult {
  cashFromSales: number;
  cashFromReceivables: number;
  totalOperatingInflows: number;
  cashPaidForExpenses: number;
  cashPaidForInventory: number;
  totalOperatingOutflows: number;
  netOperatingCashFlow: number;
  cashPaidForFixedAssets: number;
  netInvestingCashFlow: number;
  cashPaidForPayables: number;
  cashFromCapital: number;
  netFinancingCashFlow: number;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  cashDrawerEnding: number;
  bankBcaEnding: number;
}

