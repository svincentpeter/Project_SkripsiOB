import { describe, expect, it } from 'vitest';
import type { StoreSettings, UserSession } from '../../types';
import { setExportConfig } from '../exportConfig';
import { buildKop } from '../kop';

describe('buildKop', () => {
  it('pakai settings + user aktif', () => {
    setExportConfig(
      { store_name: 'Omah Ban', branch_name: 'Cabang 3', address: 'Jl. Raya Magelang', city: 'Magelang', phone: '(0293) 314-889', email: 'info@omahban.co.id' } as StoreSettings,
      { name: 'Catherine', role: 'OWNER' } as UserSession,
    );
    const kop = buildKop('Jurnal Umum', '01 Sep 2026 - 08 Sep 2026');
    expect(kop.storeName).toBe('Omah Ban');
    expect(kop.reportTitle).toBe('JURNAL UMUM');
    expect(kop.generatedBy).toBe('Catherine (OWNER)');
  });
});
