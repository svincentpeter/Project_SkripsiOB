import { apiClient } from './apiClient';
import type { DailyCashReport, DailyRecap } from '../../shared/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** Laporan operasional harian; server sudah mengirim angka sebagai number, jadi tanpa mapper. */
export const reportsApi = {
  dailyRecap: async (from: string, to: string) =>
    (await apiClient.get<Envelope<DailyRecap>>('/reports/daily-recap', { from, to })).data,
  dailyCash: async (date: string) =>
    (await apiClient.get<Envelope<DailyCashReport>>('/reports/daily-cash', { date })).data,
};
