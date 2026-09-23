import { apiClient } from './apiClient';

export interface QrisChargeResponse {
  order_id: string;
  gross_amount: number;
  transaction_id?: string;
  transaction_status: string;
  qr_string: string;
  qr_url?: string | null;
  expiry_time?: string;
  is_fallback?: boolean;
}

export interface QrisStatusResponse {
  order_id: string;
  transaction_status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny';
  payment_type?: string;
  gross_amount?: number;
  settlement_time?: string | null;
  is_simulated?: boolean;
}

// Status pembayaran QRIS hanya berasal dari server; tidak ada fallback lokal,
// karena checkout server memverifikasi ulang status order sebelum membukukan nota.
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
    apiClient.post<{ success: boolean; data: any }>(`/payment/qris/simulate/${orderId}`),
};
