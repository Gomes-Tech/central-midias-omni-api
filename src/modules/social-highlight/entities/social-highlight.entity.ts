export interface SocialHighlightList {
  id: string;
  name: string;
  link: string | null;
  order: number;
  isActive: boolean;
  initialDate: Date | null;
  finishDate: Date | null;
}

export interface SocialHighlight {
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
