import { describe, expect, it } from 'vitest';
import type { BankStatementLine, OutstandingLedgerItem } from '../../../shared/types/sakEmkm';
import { groupCandidates, groupGapCents } from '../bankGroupMatch';

const line = (amount: number) => ({ id: 1, amount }) as BankStatementLine;
const item = (id: number, debit: number, credit = 0) => ({ journal_item_id: id, debit, credit }) as OutstandingLedgerItem;

describe('bank group matching', () => {
  const sales = [item(1, 100000.5), item(2, 200000), item(3, 0, 50000), item(4, 400000)];

  it('offers only same-direction journals no larger than the statement line', () => {
    expect(groupCandidates(line(350000.5), sales).map((i) => i.journal_item_id)).toEqual([1, 2]);
    expect(groupCandidates(line(-60000), sales).map((i) => i.journal_item_id)).toEqual([3]);
  });

  it('reports the remaining gap in cents', () => {
    expect(groupGapCents(line(350000.5), [sales[0], sales[1]])).toBe(5000000);
    expect(groupGapCents(line(300000.5), [sales[0], sales[1]])).toBe(0);
    expect(groupGapCents(line(300000.5), [])).toBe(30000050);
  });
});
