import { CartItem, PaymentMethod, PosTransaction, ProductItem, SalesBookingRecord } from '../shared/types';
import { allocateFifoBatches } from './fifoCostingService';

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `OB3-INV-${yearMonth}-${randomSuffix}`;
};

export const generateBookingNumber = (): string => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `BK-${yearMonth}-${randomSuffix}`;
};

export const calculateCartTotals = (
  cart: CartItem[],
  discountAmount: number = 0,
  taxRatePercent: number = 0
) => {
  const subtotal = cart.reduce((acc, item) => {
    const unitPrice = item.custom_price ?? (item.item_type === 'SERVICE' && item.service ? item.service.standard_price : (item.product.product_price ?? item.product.price ?? 0));
    return acc + unitPrice * item.qty - (item.discount_per_item ?? 0) * item.qty;
  }, 0);

  const totalDiscount = discountAmount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const tax = Math.round((taxableAmount * taxRatePercent) / 100);
  const grandTotal = taxableAmount + tax;

  const totalHpp = cart.reduce((acc, item) => {
    if (item.custom_hpp !== undefined) {
      return acc + item.custom_hpp * item.qty;
    }
    if (item.item_type === 'SERVICE') {
      return acc + (item.service?.cost_price || 0) * item.qty;
    }
    const { totalHpp: itemHpp } = allocateFifoBatches(item.product, item.qty);
    return acc + itemHpp;
  }, 0);

  return {
    subtotal,
    discount: totalDiscount,
    tax,
    grandTotal,
    totalHpp,
  };
};

export const createPosTransactionRecord = (
  invoiceNo: string,
  cart: CartItem[],
  customerName: string,
  vehiclePlate: string,
  vehicleModel: string,
  paymentMethod: PaymentMethod,
  cashTendered: number,
  cashierName: string,
  taxRatePercent: number = 0,
  manualDiscount: number = 0,
  isBon: boolean = false
): PosTransaction => {
  const totals = calculateCartTotals(cart, manualDiscount, taxRatePercent);
  const change = Math.max(0, cashTendered - totals.grandTotal);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  return {
    id: invoiceNo,
    reference: invoiceNo,
    invoice_number: invoiceNo,
    date: dateStr,
    timestamp: timeStr,
    customer_name: customerName ? customerName.trim() : '',
    vehicle_plate: vehiclePlate ? vehiclePlate.trim() : '',
    vehicle_model: vehicleModel ? vehicleModel.trim() : undefined,
    cashier_name: cashierName,
    items: cart.map((item) => ({
      item_type: item.item_type || 'PRODUCT',
      product: item.product,
      service: item.service,
      qty: item.qty,
      discount_per_item: item.discount_per_item ?? 0,
      custom_price: item.custom_price,
      custom_name_override: item.custom_name_override,
      note: item.note,
      override_reason: item.override_reason,
      adjusted_by: item.adjusted_by,
    })),
    subtotal: totals.subtotal,
    gross_sales_amount: totals.subtotal,
    total_discount: totals.discount,
    discount_amount: totals.discount,
    tax_amount: totals.tax,
    tax_rate: taxRatePercent,
    tax_percentage: taxRatePercent,
    grand_total: totals.grandTotal,
    total_amount: totals.grandTotal,
    total_cost_hpp: totals.totalHpp,
    total_hpp: totals.totalHpp,
    gross_profit: totals.grandTotal - totals.totalHpp,
    total_profit: totals.grandTotal - totals.totalHpp,
    payment_method: paymentMethod,
    amount_paid: isBon ? 0 : cashTendered,
    paid_amount: isBon ? 0 : cashTendered,
    change_amount: isBon ? 0 : change,
    status: isBon ? 'PENDING' : 'LUNAS',
    stock_deducted: true,
  };
};

export const createSalesBookingRecord = (
  cart: CartItem[],
  customerName: string,
  customerPhone: string,
  vehiclePlate: string,
  vehicleModel: string,
  dpAmount: number,
  paymentMethod: PaymentMethod,
  notes?: string
): SalesBookingRecord => {
  const totals = calculateCartTotals(cart, 0, 0);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fullTime = `${dateStr} ${now.toTimeString().split(' ')[0].substring(0, 5)}`;

  return {
    id: `bk-${Date.now()}`,
    booking_number: generateBookingNumber(),
    date: dateStr,
    customer_name: customerName,
    customer_phone: customerPhone,
    vehicle_plate: vehiclePlate,
    vehicle_model: vehicleModel,
    items: [...cart],
    estimated_total: totals.grandTotal,
    dp_amount: dpAmount,
    remaining_amount: Math.max(0, totals.grandTotal - dpAmount),
    payment_method: paymentMethod,
    notes: notes,
    status: 'ACTIVE',
    created_at: fullTime,
  };
};
