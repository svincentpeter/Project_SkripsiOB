import { ServiceCategory, ServiceMasterItem } from '../shared/types';

export const generateServiceCode = (category: ServiceCategory): string => {
  const prefixMap: Record<ServiceCategory, string> = {
    SPOORING: 'SRV-SPR',
    BALANCING: 'SRV-BLC',
    BONGKAR_PASANG: 'SRV-PSG',
    PERBAIKAN_BAN: 'SRV-TMB',
    NITROGEN: 'SRV-N2',
    JASA_MANUAL: 'SRV-MNL',
  };
  const prefix = prefixMap[category] || 'SRV-GEN';
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randomSuffix}`;
};

export const createServiceItem = (
  services: ServiceMasterItem[],
  input: Omit<ServiceMasterItem, 'id' | 'is_active'>
): { updatedServices: ServiceMasterItem[]; createdService: ServiceMasterItem } => {
  const newService: ServiceMasterItem = {
    ...input,
    id: `srv-${Date.now()}`,
    service_code: input.service_code || generateServiceCode(input.category),
    is_active: true,
  };

  return {
    updatedServices: [newService, ...services],
    createdService: newService,
  };
};

export const updateServiceItem = (
  services: ServiceMasterItem[],
  serviceId: string,
  updates: Partial<ServiceMasterItem>
): ServiceMasterItem[] => {
  return services.map((srv) => (srv.id === serviceId ? { ...srv, ...updates } : srv));
};

export const deleteOrToggleServiceItem = (
  services: ServiceMasterItem[],
  serviceId: string
): ServiceMasterItem[] => {
  return services.map((srv) => (srv.id === serviceId ? { ...srv, is_active: !srv.is_active } : srv));
};
