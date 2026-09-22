import { describe, it, expect } from 'vitest';
import { INITIAL_STORE_SETTINGS, INITIAL_TRANSACTIONS, INITIAL_JOURNALS, INITIAL_ACCOUNT_BALANCES, INITIAL_PRODUCTS } from '../../../shared/data/mockData';
import { calculateDynamicSakEmkmFinancials, calculateCashFlowStatement } from '../../../services/accountingService';

describe('Financials, Receipt & Settings SAK EMKM Audit', () => {
  it('should have complete SAK EMKM COA mapping and initial balances in INITIAL_STORE_SETTINGS', () => {
    expect(INITIAL_STORE_SETTINGS.coa_cash_account).toBe('1-1000');
    expect(INITIAL_STORE_SETTINGS.coa_bank_account).toBe('1-1001');
    expect(INITIAL_STORE_SETTINGS.coa_receivable_account).toBe('1-1002');
    expect(INITIAL_STORE_SETTINGS.coa_inventory_account).toBe('1-2000');
    expect(INITIAL_STORE_SETTINGS.coa_payable_account).toBe('2-1000');
    expect(INITIAL_STORE_SETTINGS.coa_equity_account).toBe('3-1000');
    expect(INITIAL_STORE_SETTINGS.coa_sales_account).toBe('4-1000');
    expect(INITIAL_STORE_SETTINGS.coa_cogs_account).toBe('5-1000');
    expect(INITIAL_STORE_SETTINGS.initial_cash_drawer).toBeGreaterThan(0);
    expect(INITIAL_STORE_SETTINGS.initial_bank_balance).toBeGreaterThan(0);
    expect(INITIAL_STORE_SETTINGS.active_fiscal_month).toBe('September');
    expect(INITIAL_STORE_SETTINGS.active_fiscal_year).toBe(2026);
  });

  it('should have non-empty INITIAL_TRANSACTIONS with valid invoice structure and zero banned terms', () => {
    expect(INITIAL_TRANSACTIONS.length).toBeGreaterThan(0);
    INITIAL_TRANSACTIONS.forEach((tx) => {
      expect(tx.id).toBeDefined();
      expect(tx.invoice_number || tx.reference).toMatch(/^OB3-INV-/);
      expect(tx.grand_total).toBeGreaterThan(0);
      expect(tx.items.length).toBeGreaterThan(0);

      // Strict ban checks
      const txString = JSON.stringify(tx).toLowerCase();
      expect(txString).not.toContain('ban bekas');
      expect(txString).not.toContain('bsd');
    });
  });

  it('should calculate SAK EMKM Financials correctly with positive sales and gross profit', () => {
    const fin = calculateDynamicSakEmkmFinancials(
      INITIAL_JOURNALS,
      INITIAL_ACCOUNT_BALANCES,
      INITIAL_PRODUCTS
    );

    expect(fin.netSales).toBeGreaterThan(0);
    expect(fin.grossProfit).toBeGreaterThan(0);
    expect(fin.liquidCash).toBeGreaterThan(0);
    expect(fin.isBalanceSheetBalanced).toBe(true);
    expect(fin.isLiquiditySafe).toBe(true);
  });

  it('should calculate SAK EMKM Cash Flow Statement correctly', () => {
    const cf = calculateCashFlowStatement(
      INITIAL_JOURNALS,
      INITIAL_ACCOUNT_BALANCES,
      '2026-09-01',
      '2026-09-30'
    );

    expect(cf.endingCash).toBeGreaterThan(0);
    expect(cf.beginningCash).toBeGreaterThan(0);
  });
});
