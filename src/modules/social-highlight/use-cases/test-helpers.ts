import { CreateSocialHighlightDTO, UpdateSocialHighlightDTO } from '../dto';
import { SocialHighlight as SocialHighlightEntity } from '../entities';

type SocialHighlightFixture = SocialHighlightEntity & {
  organizationId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export function makeSocialHighlight(
  overrides: Partial<SocialHighlightFixture> = {},
): SocialHighlightFixture {
  return {
    id: 'social-highlight-id',
    organizationId: 'organization-id',
    mobileImageKey: '/storage/social-highlights/mobile/social-highlight-mobile.png',
    desktopImageKey: '/storage/social-highlights/social-highlight-desktop.png',
    mobileImageUrl: null,
    desktopImageUrl: null,
    name: 'Destaque social principal',
    link: 'https://example.com/social-highlight',
    order: 1,
    isActive: true,
    initialDate: new Date('2024-01-01T00:00:00.000Z'),
    finishDate: new Date('2024-01-10T00:00:00.000Z'),
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

export function makeCreateSocialHighlightDTO(
  overrides: Partial<CreateSocialHighlightDTO> = {},
): CreateSocialHighlightDTO {
  return {
    name: 'Destaque social principal',
    link: 'https://example.com/social-highlight',
    order: 1,
    isActive: true,
    initialDate: new Date('2024-01-01T00:00:00.000Z'),
    finishDate: new Date('2024-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

export function makeUpdateSocialHighlightDTO(
  overrides: Partial<UpdateSocialHighlightDTO> = {},
): UpdateSocialHighlightDTO {
  return {
    name: 'Destaque social atualizado',
    link: 'https://example.com/social-highlight-updated',
    order: 2,
    isActive: false,
    initialDate: new Date('2024-02-01T00:00:00.000Z'),
    finishDate: new Date('2024-02-10T00:00:00.000Z'),
    ...overrides,
  };
}

export function makeSocialHighlightFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    originalname: 'social-highlight.png',
    filename: 'social-highlight.png',
    mimetype: 'image/png',
    size: 1024,
    ...overrides,
  } as Express.Multer.File;
}

export function makeCreateSocialHighlightFiles(overrides?: {
  mobile?: Express.Multer.File;
  desktop?: Express.Multer.File;
}) {
  return {
    mobile:
      overrides?.mobile ??
      makeSocialHighlightFile({ originalname: 'social-highlight-mobile.png' }),
    desktop:
      overrides?.desktop ??
      makeSocialHighlightFile({ originalname: 'social-highlight-desktop.png' }),
  };
}

export function makeUpdateSocialHighlightFiles(overrides?: {
  mobileImage?: Express.Multer.File;
  desktopImage?: Express.Multer.File;
}): {
  mobileImage: Express.Multer.File;
  desktopImage: Express.Multer.File;
} {
  return {
    mobileImage:
      overrides?.mobileImage ??
      makeSocialHighlightFile({ originalname: 'social-highlight-mobile.png' }),
    desktopImage:
      overrides?.desktopImage ??
      makeSocialHighlightFile({ originalname: 'social-highlight-desktop.png' }),
  };
}

export function makeStorageFile(
  overrides: Partial<{
    id: string;
    path: string;
    fullPath: string;
    publicUrl: string;
  }> = {},
) {
  return {
    id: 'file-id',
    path: 'social-highlights/social-highlight.png',
    fullPath: '/tmp/social-highlights/social-highlight.png',
    publicUrl: '/storage/social-highlights/social-highlight.png',
    ...overrides,
  };
}
