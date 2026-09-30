import { describe, it, expect } from 'vitest';
import { INITIAL_STORE_SETTINGS, INITIAL_TRANSACTIONS } from '../../../shared/data/mockData';

describe('Financials, Receipt & Settings SAK EMKM Audit', () => {
  it('should have complete SAK EMKM COA mapping and initial balances in INITIAL_STORE_SETTINGS', () => {
    expect(INITIAL_STORE_SETTINGS.coa_cash_account).toBe('1-1000');
    expect(INITIAL_STORE_SETTINGS.coa_bank_account).toBe('1-1001');
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

  it('keeps no EDC settings or BON receivable account in the store settings', () => {
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('edc_settings');
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('coa_receivable_account');
  });

  it('keeps payment providers on the server, not in the store settings', () => {
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('bank_providers');
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('qris_providers');
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
});
