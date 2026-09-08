import { describe, it, expect } from 'vitest';
import { getShortCategoryName } from '../PosScreen';

describe('getShortCategoryName', () => {
  it('shortens tire categories to "Ban"', () => {
    expect(getShortCategoryName('BAN_BARU', 'Ban Mobil Baru')).toBe('Ban');
    expect(getShortCategoryName('BAN_BARU', 'Ban Luar')).toBe('Ban');
    expect(getShortCategoryName('TIRE', 'Ban Radial')).toBe('Ban');
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
