import { apiClient, authToken } from './apiClient';
import { RolePermissionsConfig, UserSession } from '../../shared/types';

interface LoginResponse {
  token: string;
  expires_at: string;
  user: UserSession;
}

export const authApi = {
  async login(login: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', { login, password });
    authToken.set(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Token tetap dibuang di sisi klien walau server tidak terjangkau.
    } finally {
      authToken.clear();
    }
  },

  async me(): Promise<UserSession> {
    const res = await apiClient.get<{ user: UserSession }>('/auth/me');
    return res.user;
  },

  getRolePermissions: () => apiClient.get<RolePermissionsConfig>('/settings/role-permissions'),

  updateRolePermissions: (config: RolePermissionsConfig) =>
    apiClient.put<RolePermissionsConfig>('/settings/role-permissions', config),
};
