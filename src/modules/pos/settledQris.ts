import { CartItem, PaymentMethod } from '../../shared/types';
import { formatRupiah } from '../../shared/utils/formatters';

/** Order QRIS dinamis yang sudah lunas di Midtrans tetapi belum tercatat di nota (checkout gagal setelah bayar). */
export interface SettledQris {
  orderId: string;
  amount: number;
  /** Sidik keranjang & pelanggan saat ditagih: order hanya boleh membayar transaksi yang sama. */
  cartKey: string;
}

interface CheckoutSelection {
  isSplitMode: boolean;
  paymentMethod: PaymentMethod;
  qrisFlowType: 'DYNAMIC' | 'MANUAL';
  netPayable: number;
  cartKey: string;
}

/** Sidik transaksi: baris keranjang (barang/jasa, qty, harga, diskon) + pelanggan & kendaraan. */
export const qrisCartKey = (cart: CartItem[], customerName: string, vehiclePlate: string): string =>
  JSON.stringify([
    customerName.trim().toLowerCase(),
    vehiclePlate.trim().toUpperCase(),
    cart.map((item) => [
      item.item_type ?? 'PRODUCT',
      item.service?.id ?? item.product.id,
      item.qty,
      item.discount_per_item,
      item.custom_price ?? null,
      item.custom_name_override ?? null,
    ]),
  ]);

/** Order lunas dipakai ulang hanya untuk QRIS dinamis tunggal pada keranjang yang sama dengan total yang sama persis. */
export const reusableSettledQris = (settled: SettledQris | null, sel: CheckoutSelection): SettledQris | null =>
  settled &&
  !sel.isSplitMode &&
  sel.paymentMethod === 'QRIS' &&
  sel.qrisFlowType === 'DYNAMIC' &&
  settled.amount === sel.netPayable &&
  settled.cartKey === sel.cartKey
    ? settled
    : null;

/** Peringatan bagi kasir bila ada order QRIS lunas yang tidak akan terpakai oleh pilihan saat ini. */
export const settledQrisWarning = (settled: SettledQris | null, sel: CheckoutSelection): string => {
  if (!settled || reusableSettledQris(settled, sel)) return '';
  const paid = `Order QRIS ${settled.orderId} sudah dibayar ${formatRupiah(settled.amount)} tetapi belum tercatat di nota.`;
  return settled.cartKey !== sel.cartKey
    ? `${paid} Order itu untuk keranjang/pelanggan lain dan tidak dipakai di transaksi ini; kembalikan dana pelanggan tersebut secara manual.`
    : `${paid} Pilih QRIS Dinamis dengan total ${formatRupiah(settled.amount)} untuk memakainya, atau kembalikan dana pelanggan secara manual.`;
};
