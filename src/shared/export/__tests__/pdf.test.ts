import type { Content } from 'pdfmake/interfaces';
import { describe, expect, it } from 'vitest';
import { buildPdfDef } from '../writers/pdf';
import { fixtureDoc } from './fixtures';

describe('buildPdfDef', () => {
  const def = buildPdfDef(fixtureDoc);
  it('orientasi ikut doc', () => expect(def.pageOrientation).toBe('landscape'));
  it('tabel = header + 2 baris + TOTAL', () => {
    const content = Array.isArray(def.content) ? def.content : [def.content];
    const tables = content.filter((c): c is Extract<Content, { table: unknown }> => typeof c === 'object' && 'table' in c);
    expect(tables.length).toBe(1);
    expect(tables[0].table.body.length).toBe(4);
  });
  it('footer nomor halaman Indonesia', () => {
    const f = def.footer;
    expect(typeof f).toBe('function');
    if (typeof f === 'function') {
      const out = f(1, 2, { width: 842, height: 595, orientation: 'landscape' });
      expect(typeof out === 'object' && 'text' in out ? out.text : '').toBe('Hal 1 dari 2');
    }
  });
});
