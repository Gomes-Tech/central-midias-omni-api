export interface BannerList {
  id: string;
  name: string;
  link: string | null;
  order: number;
  isActive: boolean;
  initialDate: Date | null;
  finishDate: Date | null;
}

export interface Banner {
  id: string;
  name: string;
  link: string | null;
  order: number;
  isActive: boolean;
  initialDate: Date | null;
  finishDate: Date | null;
  mobileImageUrl: string | null;
  desktopImageUrl: string | null;
  mobileImageKey: string | null;
  desktopImageKey: string | null;
}
