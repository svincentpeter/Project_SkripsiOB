import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Baca kredensial dari environment variable (Vite atau Next.js compatible)
const supabaseUrl: string | undefined =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey: string | undefined =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cek apakah kredensial Supabase telah dikonfigurasi dan valid.
 */
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) return false;
  return supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 20;
};

/**
 * Instance Supabase Client singleton.
 * Bernilai null jika environment variable belum dikonfigurasi.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Tes koneksi ke database Supabase PostgreSQL.
 */
export const testSupabaseConnection = async (): Promise<{
  connected: boolean;
  message: string;
  url?: string;
}> => {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      connected: false,
      message: 'Kredensial Supabase (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) belum diset.',
    };
  }

  try {
    const { error } = await supabase
      .from('store_settings')
      .select('id')
      .limit(1);

    if (error) {
      return {
        connected: false,
        message: `Koneksi Supabase error: ${error.message} (${error.code || 'UNKNOWN'})`,
        url: supabaseUrl,
      };
    }

    return {
      connected: true,
      message: 'Terhubung ke Supabase PostgreSQL Cloud',
      url: supabaseUrl,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Gagal menjangkau Supabase: ${err.message || err}`,
      url: supabaseUrl,
    };
  }
};
