import {
  makeBanner,
  makeBannerFile,
  makeCreateBannerDTO,
  makeCreateBannerFiles,
  makeStorageFile,
  makeUpdateBannerDTO,
  makeUpdateBannerFiles,
} from './test-helpers';

describe('banner use-cases test-helpers', () => {
  it('makeUpdateBannerDTO retorna padrão e aplica overrides', () => {
    expect(makeUpdateBannerDTO()).toEqual({
      name: 'Banner atualizado',
      link: 'https://example.com/banner-updated',
      order: 2,
      isActive: false,
      initialDate: new Date('2024-02-01T00:00:00.000Z'),
      finishDate: new Date('2024-02-10T00:00:00.000Z'),
    });
    expect(makeUpdateBannerDTO({ name: 'Custom' }).name).toBe('Custom');
  });

  it('makeUpdateBannerFiles usa arquivos customizados quando informados', () => {
    const mobileImage = makeBannerFile({ originalname: 'custom-mobile.png' });
    const desktopImage = makeBannerFile({ originalname: 'custom-desktop.png' });

    expect(makeUpdateBannerFiles({ mobileImage }).mobileImage).toBe(mobileImage);
    expect(makeUpdateBannerFiles({ desktopImage }).desktopImage).toBe(
      desktopImage,
    );
    expect(
      makeUpdateBannerFiles({ mobileImage, desktopImage }),
    ).toEqual({ mobileImage, desktopImage });
  });

  it('makeBanner, makeCreateBannerDTO e makeBannerFile aplicam defaults e overrides', () => {
    expect(makeBanner().id).toBe('banner-id');
    expect(makeBanner({ id: 'x' }).id).toBe('x');
    expect(makeCreateBannerDTO().name).toBe('Banner principal');
    expect(makeCreateBannerDTO({ name: 'N' }).name).toBe('N');
    expect(makeBannerFile().originalname).toBe('banner.png');
    expect(makeBannerFile({ originalname: 'x.png' }).originalname).toBe(
      'x.png',
    );
  });

  it('makeCreateBannerFiles e makeStorageFile aplicam defaults e overrides', () => {
    const mobile = makeBannerFile({ originalname: 'm.png' });
    const desktop = makeBannerFile({ originalname: 'd.png' });

    expect(makeCreateBannerFiles().mobile.originalname).toBe(
      'banner-mobile.png',
    );
    expect(makeCreateBannerFiles({ mobile, desktop })).toEqual({
      mobile,
      desktop,
    });
    expect(makeStorageFile().publicUrl).toBe('/storage/banners/banner.png');
    expect(makeStorageFile({ publicUrl: '/custom' }).publicUrl).toBe('/custom');
  });
});
