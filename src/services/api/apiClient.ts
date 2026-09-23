// Client HTTP terstandarisasi untuk koneksi React ke Laravel 12 REST API

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const TOKEN_KEY = 'ob3_auth_token';

const safeStorage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

/** Token Sanctum sesi login; masa berlakunya dibatasi server. */
export const authToken = {
  get: (): string | null => safeStorage()?.getItem(TOKEN_KEY) ?? null,
  set: (token: string) => safeStorage()?.setItem(TOKEN_KEY, token),
  clear: () => safeStorage()?.removeItem(TOKEN_KEY),
};

let unauthorizedHandler: (() => void) | null = null;

/** Dipanggil saat server menolak token (401) agar App kembali ke layar login. */
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

async function request<T>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {}),
  };
  const token = authToken.get();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const timeoutMs = options.timeoutMs ?? (isFormData ? 30000 : 10000);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        authToken.clear();
        unauthorizedHandler?.();
      }
      const errorMsg = data?.message || `Request gagal dengan status ${response.status}`;
      throw new ApiError(errorMsg, response.status, data);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError(`Koneksi ke backend Laravel timeout (melebihi ${timeoutMs / 1000} detik)`, 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Gagal menghubungi server backend Laravel di ${API_BASE_URL}: ${error.message}`, 0);
  }
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T>(endpoint: string) => {
    return request<T>(endpoint, { method: 'DELETE' });
  },

  upload: <T>(endpoint: string, formData: FormData, timeoutMs = 45000) => {
    return request<T>(endpoint, {
      method: 'POST',
      body: formData,
      timeoutMs,
    });
  },
};
