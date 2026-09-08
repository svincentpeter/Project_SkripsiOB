const ymd = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export const buildFileName = (title: string, startDate?: string, endDate?: string): string => {
  const base = title.replace(/\s+/g, '');
  if (startDate && endDate) return `${base}_${ymd(new Date(startDate))}-${ymd(new Date(endDate))}`;
  return `${base}_${ymd(new Date())}`;
};
