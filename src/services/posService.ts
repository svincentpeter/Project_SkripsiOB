import { CartItem, PaymentMethod, PosTransaction } from '../shared/types';
import { localDate } from './accountingPeriod';
import { allocateFifoBatches } from './fifoCostingService';

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `OB3-INV-${yearMonth}-${randomSuffix}`;
};

export const calculateCartTotals = (
  cart: CartItem[],
  discountAmount: number = 0
) => {
  const subtotal = cart.reduce((acc, item) => {
    const unitPrice = item.custom_price ?? (item.item_type === 'SERVICE' && item.service ? item.service.standard_price : (item.product.product_price ?? item.product.price ?? 0));
    return acc + unitPrice * item.qty - (item.discount_per_item ?? 0) * item.qty;
  }, 0);

  const totalDiscount = discountAmount;
  const grandTotal = Math.max(0, subtotal - totalDiscount);

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
    grandTotal,
    totalHpp,
  };
};

/** Nota sementara untuk pratinjau/cetak sebelum checkout (tidak disimpan). Setiap nota lunas saat checkout. */
export const createPosTransactionRecord = (
  invoiceNo: string,
  cart: CartItem[],
  customerName: string,
  vehiclePlate: string,
  vehicleModel: string,
  paymentMethod: PaymentMethod,
  cashTendered: number,
  cashierName: string,
  manualDiscount: number = 0
): PosTransaction => {
  const totals = calculateCartTotals(cart, manualDiscount);
  const change = Math.max(0, cashTendered - totals.grandTotal);
  const now = new Date();
  const dateStr = localDate(now);
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
