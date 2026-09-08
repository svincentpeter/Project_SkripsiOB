import type { StoreSettings, UserSession } from '../types';

interface ExportConfig {
  settings: StoreSettings | null;
  user: UserSession | null;
}

let config: ExportConfig = { settings: null, user: null };

export const setExportConfig = (settings: StoreSettings | null, user: UserSession | null): void => {
  config = { settings, user };
};

export const getExportConfig = (): ExportConfig => config;
