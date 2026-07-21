import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FaqRepository } from '../repository/faq.repository';
import { UpsertFaqDetailUseCase } from './upsert-faq-detail.use-case';

describe('UpsertFaqDetailUseCase', () => {
  let faqRepository: jest.Mocked<
    Pick<FaqRepository, 'existsById' | 'upsertDetail'>
  >;
  let storageService: jest.Mocked<Pick<StorageService, 'uploadFile'>>;
  let useCase: UpsertFaqDetailUseCase;

  const data = {
    description: 'Descrição',
    phonePrimary: '11999999999',
  };

  beforeEach(() => {
    faqRepository = {
      existsById: jest.fn(),
      upsertDetail: jest.fn(),
    };
    storageService = {
      uploadFile: jest.fn(),
    };

    useCase = new UpsertFaqDetailUseCase(
      faqRepository as unknown as FaqRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve lançar NotFound quando a organização não possuir FAQ', async () => {
    faqRepository.existsById.mockResolvedValue(null);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(faqRepository.upsertDetail).not.toHaveBeenCalled();
  });

  it('deve salvar o detalhe sem imagem quando nenhum arquivo for enviado', async () => {
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.upsertDetail.mockResolvedValue(undefined);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1'),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(faqRepository.upsertDetail).toHaveBeenCalledWith(
      'faq-1',
      data,
      'user-1',
    );
  });

  it('deve fazer upload da imagem e incluir a imageKey ao salvar o detalhe', async () => {
    const file = { originalname: 'imagem.png' } as Express.Multer.File;
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    storageService.uploadFile.mockResolvedValue({
      path: 'faqs/imagem.png',
    });
    faqRepository.upsertDetail.mockResolvedValue(undefined);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1', file),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledWith(file, 'faqs');
    expect(faqRepository.upsertDetail).toHaveBeenCalledWith(
      'faq-1',
      { ...data, imageKey: 'faqs/imagem.png' },
      'user-1',
    );
  });

  it('deve propagar erro quando o upload da imagem falhar', async () => {
    const file = { originalname: 'imagem.png' } as Express.Multer.File;
    const error = new Error('Falha no upload');
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    storageService.uploadFile.mockRejectedValue(error);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1', file),
    ).rejects.toBe(error);

    expect(faqRepository.upsertDetail).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando o repositório falhar ao salvar o detalhe', async () => {
    const error = new Error('Erro ao salvar detalhes do FAQ');
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.upsertDetail.mockRejectedValue(error);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1'),
    ).rejects.toBe(error);
  });
});
