export interface TopUserByPlatformLoginRow {
  userId: string;
  name: string;
  email: string;
  loginCount: number;
  lastLoginAt: Date | null;
}

export interface TopUserByMaterialDownloadRow {
  userId: string;
  name: string;
  email: string;
  downloadCount: number;
}

export interface TopMaterialByViewRow {
  materialId: string;
  name: string;
  categoryName: string;
  viewCount: number;
}

export interface TopMaterialByDownloadRow {
  materialId: string;
  name: string;
  categoryName: string;
  downloadCount: number;
}

export interface TopSearchRow {
  term: string;
  search: string;
  tag: string;
  quantity: number;
}

export enum ReportType {
  USERS_TOP_LOGINS = 'users-top-logins',
  USERS_TOP_DOWNLOADS = 'users-top-downloads',
  MATERIALS_TOP_VIEWS = 'materials-top-views',
  MATERIALS_TOP_DOWNLOADS = 'materials-top-downloads',
  SEARCHES_TOP = 'searches-top',
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.USERS_TOP_LOGINS]: 'Usuários com mais logins na plataforma',
  [ReportType.USERS_TOP_DOWNLOADS]: 'Usuários que mais baixam materiais',
  [ReportType.MATERIALS_TOP_VIEWS]: 'Materiais mais acessados',
  [ReportType.MATERIALS_TOP_DOWNLOADS]: 'Materiais com mais downloads',
  [ReportType.SEARCHES_TOP]: 'Termos de busca mais encontrados',
};
