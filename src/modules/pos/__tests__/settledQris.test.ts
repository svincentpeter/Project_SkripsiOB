import { describe, it, expect } from 'vitest';
import { CartItem } from '../../../shared/types';
import { qrisCartKey, reusableSettledQris, settledQrisWarning, SettledQris } from '../settledQris';

const line = (id: string, qty: number) => ({ product: { id }, qty, discount_per_item: 0 }) as unknown as CartItem;
const cartA = qrisCartKey([line('p1', 2)], 'Budi', 'AA 1234 BC');

const paid: SettledQris = { orderId: 'POS-1727650000000', amount: 350000, cartKey: cartA };
const dynamicQris = { isSplitMode: false, paymentMethod: 'QRIS' as const, qrisFlowType: 'DYNAMIC' as const, netPayable: 350000, cartKey: cartA };

describe('settled dynamic QRIS reuse', () => {
  it('reuses the paid order when the cashier retries dynamic QRIS with the same total', () => {
    expect(reusableSettledQris(paid, dynamicQris)).toEqual(paid);
    expect(settledQrisWarning(paid, dynamicQris)).toBe('');
  });

  it('does not reuse when nothing was paid yet', () => {
    expect(reusableSettledQris(null, dynamicQris)).toBeNull();
    expect(settledQrisWarning(null, dynamicQris)).toBe('');
  });

  it('does not reuse and warns when the total changed', () => {
    const sel = { ...dynamicQris, netPayable: 300000 };
    expect(reusableSettledQris(paid, sel)).toBeNull();
    expect(settledQrisWarning(paid, sel)).toContain('POS-1727650000000');
  });

  it('does not reuse and warns when the method, flow or split mode changed', () => {
    for (const sel of [
      { ...dynamicQris, paymentMethod: 'TUNAI' as const },
      { ...dynamicQris, qrisFlowType: 'MANUAL' as const },
      { ...dynamicQris, isSplitMode: true },
    ]) {
      expect(reusableSettledQris(paid, sel)).toBeNull();
      expect(settledQrisWarning(paid, sel)).toMatch(/sudah dibayar.*manual/);
    }
  });

  it('does not reuse for another cart or customer with the same total', () => {
    for (const cartKey of [
      qrisCartKey([line('p2', 2)], 'Budi', 'AA 1234 BC'),
      qrisCartKey([line('p1', 1)], 'Budi', 'AA 1234 BC'),
      qrisCartKey([line('p1', 2)], 'Sari', 'AA 9999 ZZ'),
      qrisCartKey([], '', ''),
    ]) {
      const sel = { ...dynamicQris, cartKey };
      expect(reusableSettledQris(paid, sel)).toBeNull();
      expect(settledQrisWarning(paid, sel)).toContain('keranjang/pelanggan lain');
    }
  });

  it('ignores letter case and spacing in the customer and plate', () => {
    const sel = { ...dynamicQris, cartKey: qrisCartKey([line('p1', 2)], ' budi ', 'aa 1234 bc') };
    expect(reusableSettledQris(paid, sel)).toEqual(paid);
  });
});
