import { ApiError } from '../../services/api/apiClient';

interface ProviderFields {
  provider_name?: string;
  fee_percentage?: number;
  fee_threshold_amount?: number;
}

/** Validasi di sisi klien agar pesan tetap berbahasa Indonesia (validator server berbahasa Inggris). Mengembalikan pesan galat atau null. */
export function validateProviderInput(input: ProviderFields): string | null {
  if (!(input.provider_name ?? '').trim()) return 'Nama provider tidak boleh kosong.';
  const fee = input.fee_percentage ?? 0;
  if (!Number.isFinite(fee) || fee < 0 || fee > 100) return 'Persentase fee harus antara 0 dan 100.';
  const threshold = input.fee_threshold_amount ?? 0;
  if (!Number.isFinite(threshold) || threshold < 0) return 'Batas nominal fee tidak boleh negatif.';
  return null;
}

/** Pesan galat berbahasa Indonesia untuk kegagalan simpan; pesan mentah server (bahasa Inggris) tidak ditampilkan. */
export function providerErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return 'Data provider ditolak server. Periksa nama, kode, dan fee, lalu coba lagi.';
    if (err.status === 403) return 'Anda tidak memiliki izin untuk mengubah provider pembayaran.';
    return 'Terjadi kesalahan pada server.';
  }
  return 'Tidak dapat terhubung ke server.';
}
