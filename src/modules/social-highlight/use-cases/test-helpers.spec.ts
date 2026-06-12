import {
  makeSocialHighlight,
  makeSocialHighlightFile,
  makeCreateSocialHighlightDTO,
  makeCreateSocialHighlightFiles,
  makeStorageFile,
  makeUpdateSocialHighlightDTO,
  makeUpdateSocialHighlightFiles,
} from './test-helpers';

describe('social-highlight use-cases test-helpers', () => {
  it('makeUpdateSocialHighlightDTO retorna padrão e aplica overrides', () => {
    expect(makeUpdateSocialHighlightDTO()).toEqual({
      name: 'Destaque social atualizado',
      link: 'https://example.com/social-highlight-updated',
      order: 2,
      isActive: false,
      initialDate: new Date('2024-02-01T00:00:00.000Z'),
      finishDate: new Date('2024-02-10T00:00:00.000Z'),
    });
    expect(makeUpdateSocialHighlightDTO({ name: 'Custom' }).name).toBe('Custom');
  });

  it('makeUpdateSocialHighlightFiles usa arquivos customizados quando informados', () => {
    const mobileImage = makeSocialHighlightFile({ originalname: 'custom-mobile.png' });
    const desktopImage = makeSocialHighlightFile({ originalname: 'custom-desktop.png' });

    expect(makeUpdateSocialHighlightFiles({ mobileImage }).mobileImage).toBe(mobileImage);
    expect(makeUpdateSocialHighlightFiles({ desktopImage }).desktopImage).toBe(
      desktopImage,
    );
    expect(
      makeUpdateSocialHighlightFiles({ mobileImage, desktopImage }),
    ).toEqual({ mobileImage, desktopImage });
  });

  it('makeSocialHighlight, makeCreateSocialHighlightDTO e makeSocialHighlightFile aplicam defaults e overrides', () => {
    expect(makeSocialHighlight().id).toBe('social-highlight-id');
    expect(makeSocialHighlight({ id: 'x' }).id).toBe('x');
    expect(makeCreateSocialHighlightDTO().name).toBe('Destaque social principal');
    expect(makeCreateSocialHighlightDTO({ name: 'N' }).name).toBe('N');
    expect(makeSocialHighlightFile().originalname).toBe('social-highlight.png');
    expect(makeSocialHighlightFile({ originalname: 'x.png' }).originalname).toBe(
      'x.png',
    );
  });

  it('makeCreateSocialHighlightFiles e makeStorageFile aplicam defaults e overrides', () => {
    const mobile = makeSocialHighlightFile({ originalname: 'm.png' });
    const desktop = makeSocialHighlightFile({ originalname: 'd.png' });

    expect(makeCreateSocialHighlightFiles().mobile.originalname).toBe(
      'social-highlight-mobile.png',
    );
    expect(makeCreateSocialHighlightFiles({ mobile, desktop })).toEqual({
      mobile,
      desktop,
    });
    expect(makeStorageFile().publicUrl).toBe('/storage/social-highlights/social-highlight.png');
    expect(makeStorageFile({ publicUrl: '/custom' }).publicUrl).toBe('/custom');
  });
});
