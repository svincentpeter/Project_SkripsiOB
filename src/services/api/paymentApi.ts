import { apiClient } from './apiClient';
import { PaymentProviderSetting } from '../../shared/types';
import { ApiPaymentProvider, mapPaymentProvider } from './posMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface QrisChargeResponse {
  order_id: string;
  gross_amount: number;
  transaction_id?: string;
  transaction_status: string;
  qr_string: string;
  qr_url?: string | null;
  expiry_time?: string;
  is_fallback?: boolean;
  /** Server mengizinkan simulasi lunas (hanya demo sandbox, MIDTRANS_ALLOW_SIMULATION). */
  simulation_enabled?: boolean;
}

export interface QrisStatusResponse {
  order_id: string;
  transaction_status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny';
  payment_type?: string;
  gross_amount?: number;
  settlement_time?: string | null;
  is_simulated?: boolean;
}

export interface PaymentOptions {
  bank_providers: PaymentProviderSetting[];
  qris_providers: PaymentProviderSetting[];
}

/** Kolom yang boleh dikirim ke /settings/payment-providers (method_type hanya saat membuat). */
export interface PaymentProviderInput {
  method_type?: 'bank' | 'qris';
  provider_name?: string;
  provider_code?: string | null;
  fee_percentage?: number;
  fee_threshold_amount?: number;
  is_active?: boolean;
}

// Status pembayaran QRIS hanya berasal dari server; tidak ada fallback lokal,
// karena checkout server memverifikasi ulang order (lunas, nominal, sekali pakai) sebelum membukukan nota.
export const paymentApi = {
  chargeQris: (orderId: string, grossAmount: number, customerName?: string) =>
    apiClient.post<{ success: boolean; message: string; data: QrisChargeResponse }>('/payment/qris/charge', {
      order_id: orderId,
      gross_amount: grossAmount,
      customer_name: customerName,
    }),

  checkQrisStatus: (orderId: string) =>
    apiClient.get<{ success: boolean; data: QrisStatusResponse }>(`/payment/qris/status/${orderId}`),

  simulateQrisPayment: (orderId: string) =>
    apiClient.post<{ success: boolean; data: QrisStatusResponse }>(`/payment/qris/simulate/${orderId}`),

  /** Rekening transfer dan provider QRIS aktif untuk kasir; fee MDR checkout dihitung server dari data yang sama. */
  getPaymentOptions: async (): Promise<PaymentOptions> => {
    const { data } = await apiClient.get<Envelope<{ bank_providers: ApiPaymentProvider[]; qris_providers: ApiPaymentProvider[] }>>(
      '/pos/payment-options'
    );
    return {
      bank_providers: data.bank_providers.map(mapPaymentProvider),
      qris_providers: data.qris_providers.map(mapPaymentProvider),
    };
  },

  // Master provider untuk layar Pengaturan (tulis butuh izin role_settings).
  listProviders: async (): Promise<PaymentProviderSetting[]> =>
    (await apiClient.get<Envelope<ApiPaymentProvider[]>>('/settings/payment-providers')).data.map(mapPaymentProvider),

  createProvider: async (input: PaymentProviderInput): Promise<PaymentProviderSetting> =>
    mapPaymentProvider((await apiClient.post<Envelope<ApiPaymentProvider>>('/settings/payment-providers', input)).data),

  updateProvider: async (id: string | number, input: PaymentProviderInput): Promise<PaymentProviderSetting> =>
    mapPaymentProvider((await apiClient.put<Envelope<ApiPaymentProvider>>(`/settings/payment-providers/${id}`, input)).data),

  deleteProvider: (id: string | number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/settings/payment-providers/${id}`),
};
