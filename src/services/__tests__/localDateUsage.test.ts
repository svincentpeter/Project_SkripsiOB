import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Tanggal bisnis wajib localDate(): toISOString() memakai UTC dan mundur sehari sebelum 07:00 WIB. */
const DATE_FROM_ISO = /toISOString\(\)\s*\.\s*(split\(\s*['"]T['"]\s*\)|substring\(\s*0\s*,\s*(7|10)\s*\)|slice\(\s*0\s*,\s*(7|10)\s*\))/;

describe('business dates use localDate()', () => {
  it('no source file slices toISOString() into a date or month', () => {
    const root = join(process.cwd(), 'src');
    const offenders = (readdirSync(root, { recursive: true }) as string[])
      .filter((file) => /\.(ts|tsx)$/.test(file) && !/__tests__/.test(file))
      .filter((file) => DATE_FROM_ISO.test(readFileSync(join(root, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
