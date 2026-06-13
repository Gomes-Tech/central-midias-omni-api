import {
  TopMaterialByDownloadRow,
  TopMaterialByViewRow,
  TopUserByMaterialDownloadRow,
  TopUserByPlatformLoginRow,
} from '../entities';

const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const formatDate = (value: Date | null): string =>
  value ? value.toISOString() : '';

export const buildTopUsersByPlatformLoginsCsv = (
  rows: TopUserByPlatformLoginRow[],
): string => {
  const header = 'nome,email,total_logins,ultimo_login';
  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.name),
      escapeCsvValue(row.email),
      String(row.loginCount),
      formatDate(row.lastLoginAt),
    ].join(','),
  );

  return [header, ...lines].join('\n');
};

export const buildTopUsersByMaterialDownloadsCsv = (
  rows: TopUserByMaterialDownloadRow[],
): string => {
  const header = 'nome,email,total_downloads';
  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.name),
      escapeCsvValue(row.email),
      String(row.downloadCount),
    ].join(','),
  );

  return [header, ...lines].join('\n');
};

export const buildTopMaterialsByViewsCsv = (
  rows: TopMaterialByViewRow[],
): string => {
  const header = 'material,categoria,total_visualizacoes';
  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.name),
      escapeCsvValue(row.categoryName),
      String(row.viewCount),
    ].join(','),
  );

  return [header, ...lines].join('\n');
};

export const buildTopMaterialsByDownloadsCsv = (
  rows: TopMaterialByDownloadRow[],
): string => {
  const header = 'material,categoria,total_downloads';
  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.name),
      escapeCsvValue(row.categoryName),
      String(row.downloadCount),
    ].join(','),
  );

  return [header, ...lines].join('\n');
};

export const buildReportExportFilename = (reportSlug: string): string =>
  `relatorio-${reportSlug}.csv`;
