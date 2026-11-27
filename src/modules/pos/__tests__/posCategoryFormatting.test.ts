import { describe, it, expect } from 'vitest';
import { getShortCategoryName } from '../PosScreen';
import { buildAutoProductName } from '../components/CartLineEditModal';
import { categoryKind } from '../../../shared/utils/categoryKind';

describe('getShortCategoryName', () => {
  it('shortens tire categories to "Ban"', () => {
    expect(getShortCategoryName('BAN_BARU', 'Ban Mobil Baru')).toBe('Ban');
    expect(getShortCategoryName('BAN_BARU', 'Ban Luar')).toBe('Ban');
    expect(getShortCategoryName('TIRE', 'Ban Radial')).toBe('Ban');
  });

  it('distinguishes Ban Mobil, Ban Truk, and Ban Jeep categories without duplicate labels', () => {
    expect(getShortCategoryName('BAN-MOBIL', 'Ban Mobil')).toBe('Ban Mobil');
    expect(getShortCategoryName('BAN-TRUCK', 'Ban Niaga, Pickup & Truk Ringan')).toBe('Ban Truk');
    expect(getShortCategoryName('BAN-JEEP', 'Ban Jeep, SUV & Offroad 4x4')).toBe('Ban Jeep');
  });

  it('shortens wheel categories to "Velg"', () => {
    expect(getShortCategoryName('VELG', 'Velg Mobil Racing & OEM')).toBe('Velg');
    expect(getShortCategoryName('WHEEL', 'Velg Racing')).toBe('Velg');
  });

  it('shortens inner tube categories to "Ban Dlm"', () => {
    expect(getShortCategoryName('BAN_DALAM', 'Ban Dalam & Marset (Flap)')).toBe('Ban Dlm');
    expect(getShortCategoryName('INNER_TUBE', 'Ban Dalam')).toBe('Ban Dlm');
  });

  it('shortens oil and lubricants categories to "Oli"', () => {
    expect(getShortCategoryName('OLI_PELUMAS', 'Oli & Pelumas Mesin')).toBe('Oli');
    expect(getShortCategoryName('OIL', 'Oli Mesin')).toBe('Oli');
  });

  it('shortens accessories categories to "Aksesori"', () => {
    expect(getShortCategoryName('AKSESORIS', 'Aksesoris & Mur Roda')).toBe('Aksesori');
    expect(getShortCategoryName('ACCESSORIES', 'Aksesoris Mobil')).toBe('Aksesori');
  });

  it('handles unknown or custom categories cleanly and concisely', () => {
    expect(getShortCategoryName('CUSTOM', 'Busi Racing & Filter')).toBe('Busi');
  });
});

describe('buildAutoProductName for POS CartLineEditModal', () => {
  it('detects BAN-MOBIL as BAN_BARU and builds detailed tire name without double R prefix', () => {
    const kind = categoryKind('BAN-MOBIL');
    expect(kind).toBe('BAN_BARU');
    expect(
      buildAutoProductName(kind, {
        brand: 'Accelera',
        motif: 'SemiSlick',
        sizeWidth: '195',
        sizeRatio: '50',
        ring: '15',
        dotYear: '2026',
      }),
    ).toBe('Ban Accelera SemiSlick 195/50 R15 (DOT 2026)');
  });

  it('builds detailed VELG and BAN_DALAM names', () => {
    expect(
      buildAutoProductName(categoryKind('VELG'), {
        brand: 'HSR',
        motif: 'Myth01',
        ring: 'R17',
        pcd: '4x100',
      }),
    ).toBe('Velg HSR Myth01 R17 PCD 4x100');

    expect(
      buildAutoProductName(categoryKind('BAN_DALAM'), {
        brand: 'GTRadial',
        sizeRatio: '14',
        valveType: 'TR13',
      }),
    ).toBe('Ban Dalam GTRadial 14 (TR13)');
  });
});
