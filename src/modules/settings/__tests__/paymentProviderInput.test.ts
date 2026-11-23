import { describe, it, expect } from 'vitest';
import { ApiError } from '../../../services/api/apiClient';
import { providerErrorMessage, validateProviderInput } from '../paymentProviderInput';

describe('validateProviderInput', () => {
  it('accepts a valid provider and treats missing fee fields as zero', () => {
    expect(validateProviderInput({ provider_name: 'BCA' })).toBeNull();
    expect(validateProviderInput({ provider_name: 'GoPay', fee_percentage: 0.3, fee_threshold_amount: 500000 })).toBeNull();
    expect(validateProviderInput({ provider_name: 'X', fee_percentage: 10 })).toBeNull();
  });

  it('rejects a blank name', () => {
    expect(validateProviderInput({ provider_name: '   ' })).toMatch(/Nama/);
    expect(validateProviderInput({})).toMatch(/Nama/);
  });

  it('rejects fee outside 0-10 and negative thresholds', () => {
    expect(validateProviderInput({ provider_name: 'X', fee_percentage: 10.01 })).toMatch(/fee/);
    expect(validateProviderInput({ provider_name: 'X', fee_percentage: 30 })).toMatch(/fee/);
    expect(validateProviderInput({ provider_name: 'X', fee_percentage: -1 })).toMatch(/fee/);
    expect(validateProviderInput({ provider_name: 'X', fee_percentage: NaN })).toMatch(/fee/);
    expect(validateProviderInput({ provider_name: 'X', fee_threshold_amount: -1 })).toMatch(/negatif/);
  });
});

describe('providerErrorMessage', () => {
  it('never leaks the raw English server message', () => {
    expect(providerErrorMessage(new ApiError('The provider name field is required.', 422))).not.toMatch(/required/);
    expect(providerErrorMessage(new ApiError('This action is unauthorized.', 403))).toMatch(/izin/);
    expect(providerErrorMessage(new ApiError('Server Error', 500))).toBe('Terjadi kesalahan pada server.');
    expect(providerErrorMessage(new TypeError('Failed to fetch'))).toMatch(/terhubung/);
  });
});
