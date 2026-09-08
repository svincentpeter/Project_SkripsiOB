import { describe, expect, it } from 'vitest';
import { DEFAULT_ROLE_PERMISSIONS } from '../../shared/data/mockData';
import {
  isScreenPermittedForRole,
  getDefaultScreenForUser,
  canUserAccessBackoffice
} from '../authNavigationService';

describe('authNavigationService', () => {
  describe('isScreenPermittedForRole', () => {
    it('OWNER should have access to all screens', () => {
      expect(isScreenPermittedForRole('dashboard', 'OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
      expect(isScreenPermittedForRole('pos', 'OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
      expect(isScreenPermittedForRole('ledger', 'OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
      expect(isScreenPermittedForRole('settings', 'OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
      expect(isScreenPermittedForRole('receipt', 'OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
    });

    it('KASIR should only have access to POS and Receipt, but NOT dashboard or accounting', () => {
      expect(isScreenPermittedForRole('pos', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
      expect(isScreenPermittedForRole('receipt', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
      expect(isScreenPermittedForRole('dashboard', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
      expect(isScreenPermittedForRole('expenses', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
      expect(isScreenPermittedForRole('ledger', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
      expect(isScreenPermittedForRole('financials', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
      expect(isScreenPermittedForRole('settings', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
    });

    it('GUDANG should only have access to inventory, but NOT POS or dashboard', () => {
      expect(isScreenPermittedForRole('inventory', 'GUDANG', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
      expect(isScreenPermittedForRole('pos', 'GUDANG', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
      expect(isScreenPermittedForRole('dashboard', 'GUDANG', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
      expect(isScreenPermittedForRole('ledger', 'GUDANG', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
    });
  });

  describe('getDefaultScreenForUser', () => {
    it('returns pos for KASIR', () => {
      expect(getDefaultScreenForUser('KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe('pos');
    });

    it('returns inventory for GUDANG', () => {
      expect(getDefaultScreenForUser('GUDANG', DEFAULT_ROLE_PERMISSIONS)).toBe('inventory');
    });

    it('returns dashboard for OWNER', () => {
      expect(getDefaultScreenForUser('OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe('dashboard');
    });
  });

  describe('canUserAccessBackoffice', () => {
    it('returns true for OWNER', () => {
      expect(canUserAccessBackoffice('OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
    });

    it('returns false for KASIR who only has POS access', () => {
      expect(canUserAccessBackoffice('KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
    });
  });
});
