import { NotFoundException } from '@common/filters';
import { FaqRepository } from '../repository/faq.repository';
import { DeleteFaqUseCase } from './delete-faq.use-case';

describe('DeleteFaqUseCase', () => {
  let faqRepository: jest.Mocked<
    Pick<FaqRepository, 'existsById' | 'softDelete'>
  >;
  let useCase: DeleteFaqUseCase;

  beforeEach(() => {
    faqRepository = {
      existsById: jest.fn(),
      softDelete: jest.fn(),
    };

    useCase = new DeleteFaqUseCase(faqRepository as unknown as FaqRepository);
  });

  it('deve remover o FAQ quando a organização possuir um', async () => {
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.softDelete.mockResolvedValue(undefined);

    await expect(
      useCase.execute('faq-1', 'org-1', 'user-1'),
    ).resolves.toBeUndefined();

    expect(faqRepository.existsById).toHaveBeenCalledWith('org-1');
    expect(faqRepository.softDelete).toHaveBeenCalledWith(
      'faq-1',
      'org-1',
      'user-1',
    );
  });

  it('deve lançar NotFound quando a organização não possuir FAQ', async () => {
    faqRepository.existsById.mockResolvedValue(null);

    await expect(
      useCase.execute('faq-1', 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(faqRepository.softDelete).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando o repositório falhar ao remover', async () => {
    const error = new Error('Erro ao remover FAQ');
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.softDelete.mockRejectedValue(error);

    await expect(
      useCase.execute('faq-1', 'org-1', 'user-1'),
    ).rejects.toBe(error);
  });
});
