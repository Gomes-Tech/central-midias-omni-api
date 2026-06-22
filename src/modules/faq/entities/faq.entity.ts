export interface FaqList {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface FaqItemEntity {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface FaqItemDetail extends FaqItemEntity {
  faqId: string;
  faqName: string;
}

export interface FaqDetailEntity {
  id: string;
  description: string | null;
  imageUrl: string | null;
  phonePrimary: string | null;
  phonePrimaryLabel: string | null;
  phonePrimaryIsWhatsapp: boolean;
  phoneSecondary: string | null;
  phoneSecondaryLabel: string | null;
  phoneSecondaryIsWhatsapp: boolean;
}

export interface Faq {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  detail: FaqDetailEntity | null;
}
