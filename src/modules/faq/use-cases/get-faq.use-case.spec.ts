import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FaqRepository } from '../repository/faq.repository';
import { GetFaqUseCase } from './get-faq.use-case';

describe('GetFaqUseCase', () => {
  let faqRepository: jest.Mocked<Pick<FaqRepository, 'findByOrganizationId'>>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: GetFaqUseCase;

  beforeEach(() => {
    faqRepository = {
      findByOrganizationId: jest.fn(),
    };
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new GetFaqUseCase(
      faqRepository as unknown as FaqRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve lançar NotFound quando a organização não possuir FAQ', async () => {
    faqRepository.findByOrganizationId.mockResolvedValue(null);

    await expect(useCase.execute('org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar o FAQ sem detalhe quando não houver detalhe cadastrado', async () => {
    faqRepository.findByOrganizationId.mockResolvedValue({
      id: 'faq-1',
      name: 'FAQ',
      order: 1,
      isActive: true,
      detail: null,
    });

    await expect(useCase.execute('org-1')).resolves.toEqual({
      id: 'faq-1',
      name: 'FAQ',
      order: 1,
      isActive: true,
      detail: null,
    });

    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar o FAQ com detalhe e sem imagem quando o detalhe não tiver imageKey', async () => {
    faqRepository.findByOrganizationId.mockResolvedValue({
      id: 'faq-1',
      name: 'FAQ',
      order: 1,
      isActive: true,
      detail: {
        id: 'detail-1',
        imageKey: null,
        description: 'Descrição',
        phonePrimary: '11999999999',
        phonePrimaryLabel: 'Comercial',
        phonePrimaryIsWhatsapp: true,
        phoneSecondary: null,
        phoneSecondaryLabel: null,
        phoneSecondaryIsWhatsapp: false,
      },
    });

    await expect(useCase.execute('org-1')).resolves.toEqual({
      id: 'faq-1',
      name: 'FAQ',
      order: 1,
      isActive: true,
      detail: {
        id: 'detail-1',
        description: 'Descrição',
        imageUrl: null,
        phonePrimary: '11999999999',
        phonePrimaryLabel: 'Comercial',
        phonePrimaryIsWhatsapp: true,
        phoneSecondary: null,
        phoneSecondaryLabel: null,
        phoneSecondaryIsWhatsapp: false,
      },
    });

    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar o FAQ com detalhe e imagem quando o detalhe tiver imageKey', async () => {
    faqRepository.findByOrganizationId.mockResolvedValue({
      id: 'faq-1',
      name: 'FAQ',
      order: 1,
      isActive: true,
      detail: {
        id: 'detail-1',
        imageKey: 'faqs/imagem.png',
        description: null,
        phonePrimary: null,
        phonePrimaryLabel: null,
        phonePrimaryIsWhatsapp: false,
        phoneSecondary: null,
        phoneSecondaryLabel: null,
        phoneSecondaryIsWhatsapp: false,
      },
    });
    storageService.getPublicUrl.mockResolvedValue(
      'https://cdn.test/faqs/imagem.png',
    );

    await expect(useCase.execute('org-1')).resolves.toEqual({
      id: 'faq-1',
      name: 'FAQ',
      order: 1,
      isActive: true,
      detail: {
        id: 'detail-1',
        description: null,
        imageUrl: 'https://cdn.test/faqs/imagem.png',
        phonePrimary: null,
        phonePrimaryLabel: null,
        phonePrimaryIsWhatsapp: false,
        phoneSecondary: null,
        phoneSecondaryLabel: null,
        phoneSecondaryIsWhatsapp: false,
      },
    });

    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'faqs/imagem.png',
    );
  });

  it('deve propagar erro quando o repositório falhar', async () => {
    const error = new Error('Erro ao buscar FAQ');
    faqRepository.findByOrganizationId.mockRejectedValue(error);

    await expect(useCase.execute('org-1')).rejects.toBe(error);
  });
});
