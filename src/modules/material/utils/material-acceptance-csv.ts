import { MaterialAcceptanceReportRow } from '../entities';

const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

export const buildMaterialAcceptanceCsv = (
  rows: MaterialAcceptanceReportRow[],
): string => {
  const header = 'nome,email,visualizou,data_aceite';
  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.name),
      escapeCsvValue(row.email),
      row.viewed ? 'Sim' : 'Nao',
      row.acceptedAt ? row.acceptedAt.toISOString() : '',
    ].join(','),
  );

  return [header, ...lines].join('\n');
};

export const buildMaterialAcceptanceExportFilename = (
  materialName: string,
): string => {
  const slug = materialName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `material-aceite-${slug || 'relatorio'}.csv`;
};
