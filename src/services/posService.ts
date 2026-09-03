import { CartItem, PaymentMethod, PosTransaction, TireProduct } from '../shared/types';
import { allocateFifoBatches } from './fifoCostingService';

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `OB3-INV-${yearMonth}-${randomSuffix}`;
};

export const calculateCartTotals = (
  cart: CartItem[],
  discountAmount: number = 0,
  taxRatePercent: number = 0
) => {
  const subtotal = cart.reduce((acc, item) => {
    const unitPrice = item.custom_price ?? (item.product.product_price ?? item.product.price ?? 0);
    return acc + unitPrice * item.qty - (item.discount_per_item ?? 0) * item.qty;
  }, 0);

  const totalDiscount = discountAmount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const tax = Math.round((taxableAmount * taxRatePercent) / 100);
  const grandTotal = taxableAmount + tax;

  const totalHpp = cart.reduce((acc, item) => {
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
  manualDiscount: number = 0
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
    customer_name: customerName || 'Pelanggan Umum',
    vehicle_plate: vehiclePlate || 'B 1984 SKZ',
    cashier_name: cashierName,
    items: cart.map((item) => ({
      product: item.product,
      qty: item.qty,
      discount_per_item: item.discount_per_item ?? 0,
      custom_price: item.custom_price,
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
    amount_paid: cashTendered,
    paid_amount: cashTendered,
    change_amount: change,
    status: 'LUNAS',
    stock_deducted: true,
  };
};
