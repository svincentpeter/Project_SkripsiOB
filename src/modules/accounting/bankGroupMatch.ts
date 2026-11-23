import type { BankStatementLine, OutstandingLedgerItem } from '../../shared/types/sakEmkm';

const cents = (n: number): number => Math.round(n * 100);
const net = (i: OutstandingLedgerItem): number => i.debit - i.credit;

/** Jurnal yang boleh digabung untuk satu mutasi: searah (masuk = debit, keluar = kredit) dan tidak melebihi mutasinya. */
export const groupCandidates = (line: BankStatementLine, unmatched: OutstandingLedgerItem[]): OutstandingLedgerItem[] =>
  unmatched.filter((i) => net(i) * line.amount > 0 && Math.abs(cents(net(i))) <= Math.abs(cents(line.amount)));

/** Selisih (sen) antara mutasi dan total jurnal terpilih; 0 = siap dicocokkan. */
export const groupGapCents = (line: BankStatementLine, picked: OutstandingLedgerItem[]): number =>
  cents(line.amount) - picked.reduce((sum, i) => sum + cents(net(i)), 0);
