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

export const paymentApi = {
  chargeQris: async (
    orderId: string,
    grossAmount: number,
    customerName?: string
  ): Promise<{ success: boolean; message: string; data: QrisChargeResponse }> => {
    try {
      return await apiClient.post<any>('/payment/qris/charge', {
        order_id: orderId,
        gross_amount: grossAmount,
        customer_name: customerName,
      });
    } catch (err: any) {
      // Client-side fallback if backend is offline/mock
      const mockQr = `00020101021226590014ID.LINKAJA.WWW0118936009110022094894520458125303360540${String(
        grossAmount
      ).padStart(6, '0')}5802ID5914OMAH BAN CAB 36007BANDUNG62170113${orderId}6304ABCD`;

      return {
        success: true,
        message: 'QRIS offline fallback aktif',
        data: {
          order_id: orderId,
          gross_amount: grossAmount,
          transaction_status: 'pending',
          qr_string: mockQr,
          qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockQr)}`,
          expiry_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          is_fallback: true,
        },
      };
    }
  },

  checkQrisStatus: async (orderId: string): Promise<{ success: boolean; data: QrisStatusResponse }> => {
    try {
      return await apiClient.get<any>(`/payment/qris/status/${orderId}`);
    } catch (err: any) {
      const localSim = localStorage.getItem(`sim_settle_${orderId}`);
      if (localSim === 'settlement') {
        return {
          success: true,
          data: {
            order_id: orderId,
            transaction_status: 'settlement',
            settlement_time: new Date().toISOString(),
            is_simulated: true,
          },
        };
      }
      return {
        success: true,
        data: {
          order_id: orderId,
          transaction_status: 'pending',
          is_simulated: false,
        },
      };
    }
  },

  simulateQrisPayment: async (orderId: string): Promise<{ success: boolean; data: any }> => {
    try {
      const res = await apiClient.post<any>(`/payment/qris/simulate/${orderId}`);
      localStorage.setItem(`sim_settle_${orderId}`, 'settlement');
      return res;
    } catch {
      localStorage.setItem(`sim_settle_${orderId}`, 'settlement');
      return {
        success: true,
        data: {
          order_id: orderId,
          transaction_status: 'settlement',
          message: 'Simulasi lokal lunas.',
        },
      };
    }
  },
};
