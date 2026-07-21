import { NotFoundException } from '@common/filters';
import { FaqRepository } from '../repository/faq.repository';
import { UpdateFaqUseCase } from './update-faq.use-case';

describe('UpdateFaqUseCase', () => {
  let faqRepository: jest.Mocked<Pick<FaqRepository, 'existsById' | 'update'>>;
  let useCase: UpdateFaqUseCase;

  const data = { name: 'Novo nome' };

  beforeEach(() => {
    faqRepository = {
      existsById: jest.fn(),
      update: jest.fn(),
    };

    useCase = new UpdateFaqUseCase(faqRepository as unknown as FaqRepository);
  });

  it('deve atualizar quando a organização possuir FAQ', async () => {
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.update.mockResolvedValue(undefined);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1'),
    ).resolves.toBeUndefined();

    expect(faqRepository.existsById).toHaveBeenCalledWith('org-1');
    expect(faqRepository.update).toHaveBeenCalledWith(
      'faq-1',
      'org-1',
      data,
      'user-1',
    );
  });

  it('deve lançar NotFound quando a organização não possuir FAQ', async () => {
    faqRepository.existsById.mockResolvedValue(null);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(faqRepository.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando o repositório falhar ao atualizar', async () => {
    const error = new Error('Erro ao atualizar FAQ');
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.update.mockRejectedValue(error);

    await expect(
      useCase.execute('faq-1', 'org-1', data, 'user-1'),
    ).rejects.toBe(error);
  });
});
