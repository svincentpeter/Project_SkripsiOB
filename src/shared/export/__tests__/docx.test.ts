import { Packer } from 'docx';
import { describe, expect, it } from 'vitest';
import { buildDocument } from '../writers/docx';
import { fixtureDoc } from './fixtures';

describe('docx writer', () => {
  it('buffer zip (PK)', async () => {
    const buf = await Packer.toBuffer(buildDocument(fixtureDoc));
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
  it('ukuran wajar', async () => {
    const buf = await Packer.toBuffer(buildDocument(fixtureDoc));
    expect(buf.length).toBeGreaterThan(1000);
  });
});
