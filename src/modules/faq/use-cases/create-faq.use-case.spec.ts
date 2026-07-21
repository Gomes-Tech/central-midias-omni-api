import { FaqRepository } from '../repository/faq.repository';
import { CreateFaqUseCase } from './create-faq.use-case';

describe('CreateFaqUseCase', () => {
  let faqRepository: jest.Mocked<Pick<FaqRepository, 'create'>>;
  let useCase: CreateFaqUseCase;

  const data = {
    name: 'FAQ Principal',
    order: 1,
    isActive: true,
  };

  beforeEach(() => {
    faqRepository = {
      create: jest.fn(),
    };

    useCase = new CreateFaqUseCase(faqRepository as unknown as FaqRepository);
  });

  it('deve criar o FAQ delegando ao repositório', async () => {
    faqRepository.create.mockResolvedValue({ id: 'faq-1' });

    await expect(
      useCase.execute('org-1', data, 'user-1'),
    ).resolves.toEqual({ id: 'faq-1' });

    expect(faqRepository.create).toHaveBeenCalledWith(
      'org-1',
      data,
      'user-1',
    );
  });

  it('deve propagar erro quando o repositório falhar', async () => {
    const error = new Error('Erro ao criar FAQ');
    faqRepository.create.mockRejectedValue(error);

    await expect(useCase.execute('org-1', data, 'user-1')).rejects.toBe(
      error,
    );
  });
});
