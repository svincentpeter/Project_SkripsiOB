import { PaymentMethod } from '../../shared/types';
import { formatRupiah } from '../../shared/utils/formatters';

/** Order QRIS dinamis yang sudah lunas di Midtrans tetapi belum tercatat di nota (checkout gagal setelah bayar). */
export interface SettledQris {
  orderId: string;
  amount: number;
}

interface CheckoutSelection {
  isSplitMode: boolean;
  paymentMethod: PaymentMethod;
  qrisFlowType: 'DYNAMIC' | 'MANUAL';
  netPayable: number;
}

/** Order lunas dipakai ulang hanya untuk QRIS dinamis tunggal dengan total yang sama persis. */
export const reusableSettledQris = (settled: SettledQris | null, sel: CheckoutSelection): SettledQris | null =>
  settled &&
  !sel.isSplitMode &&
  sel.paymentMethod === 'QRIS' &&
  sel.qrisFlowType === 'DYNAMIC' &&
  settled.amount === sel.netPayable
    ? settled
    : null;

/** Peringatan bagi kasir bila ada order QRIS lunas yang tidak akan terpakai oleh pilihan saat ini. */
export const settledQrisWarning = (settled: SettledQris | null, sel: CheckoutSelection): string =>
  settled && !reusableSettledQris(settled, sel)
    ? `Order QRIS ${settled.orderId} sudah dibayar ${formatRupiah(settled.amount)} tetapi belum tercatat di nota. ` +
      `Pilih QRIS Dinamis dengan total ${formatRupiah(settled.amount)} untuk memakainya, atau kembalikan dana pelanggan secara manual.`
    : '';
