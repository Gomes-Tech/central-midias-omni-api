import { Banner } from '@prisma/client';
import { CreateBannerDTO, UpdateBannerDTO } from '../dto';

export function makeBanner(overrides: Partial<Banner> = {}): Banner {
  return {
    id: 'banner-id',
    organizationId: 'organization-id',
    mobileImageUrl: '/storage/banners/mobile/banner-mobile.png',
    desktopImageUrl: '/storage/banners/banner-desktop.png',
    name: 'Banner principal',
    link: 'https://example.com/banner',
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

export function makeCreateBannerDTO(
  overrides: Partial<CreateBannerDTO> = {},
): CreateBannerDTO {
  return {
    name: 'Banner principal',
    link: 'https://example.com/banner',
    order: 1,
    isActive: true,
    initialDate: new Date('2024-01-01T00:00:00.000Z'),
    finishDate: new Date('2024-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

export function makeUpdateBannerDTO(
  overrides: Partial<UpdateBannerDTO> = {},
): UpdateBannerDTO {
  return {
    name: 'Banner atualizado',
    link: 'https://example.com/banner-updated',
    order: 2,
    isActive: false,
    initialDate: new Date('2024-02-01T00:00:00.000Z'),
    finishDate: new Date('2024-02-10T00:00:00.000Z'),
    ...overrides,
  };
}

export function makeBannerFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    originalname: 'banner.png',
    filename: 'banner.png',
    mimetype: 'image/png',
    size: 1024,
    ...overrides,
  } as Express.Multer.File;
}

export function makeCreateBannerFiles(overrides?: {
  mobile?: Express.Multer.File;
  desktop?: Express.Multer.File;
}) {
  return {
    mobile:
      overrides?.mobile ??
      makeBannerFile({ originalname: 'banner-mobile.png' }),
    desktop:
      overrides?.desktop ??
      makeBannerFile({ originalname: 'banner-desktop.png' }),
  };
}

export function makeUpdateBannerFiles(overrides?: {
  mobileImage?: Express.Multer.File[];
  desktopImage?: Express.Multer.File[];
}) {
  return {
    mobileImage: overrides?.mobileImage ?? [
      makeBannerFile({ originalname: 'banner-mobile.png' }),
    ],
    desktopImage: overrides?.desktopImage ?? [
      makeBannerFile({ originalname: 'banner-desktop.png' }),
    ],
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
    path: 'banners/banner.png',
    fullPath: '/tmp/banners/banner.png',
    publicUrl: '/storage/banners/banner.png',
    ...overrides,
  };
}
