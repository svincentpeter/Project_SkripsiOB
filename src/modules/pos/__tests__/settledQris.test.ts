import { describe, it, expect } from 'vitest';
import { reusableSettledQris, settledQrisWarning, SettledQris } from '../settledQris';

const paid: SettledQris = { orderId: 'POS-1727650000000', amount: 350000 };
const dynamicQris = { isSplitMode: false, paymentMethod: 'QRIS' as const, qrisFlowType: 'DYNAMIC' as const, netPayable: 350000 };

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
});
