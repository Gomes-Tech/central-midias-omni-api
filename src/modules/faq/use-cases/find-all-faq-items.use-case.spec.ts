import { FaqRepository } from '../repository/faq.repository';
import { FindAllFaqItemsUseCase } from './find-all-faq-items.use-case';

describe('FindAllFaqItemsUseCase', () => {
  let faqRepository: jest.Mocked<Pick<FaqRepository, 'findAllItems'>>;
  let useCase: FindAllFaqItemsUseCase;

  const paginated = {
    data: [
      { id: 'item-1', question: 'Pergunta', answer: 'Resposta', order: 1 },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    faqRepository = {
      findAllItems: jest.fn(),
    };

    useCase = new FindAllFaqItemsUseCase(
      faqRepository as unknown as FaqRepository,
    );
  });

  it('deve usar filtros vazios quando não informados', async () => {
    faqRepository.findAllItems.mockResolvedValue(paginated);

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(faqRepository.findAllItems).toHaveBeenCalledWith({}, 'org-1');
  });

  it('deve delegar ao repositório com os filtros informados', async () => {
    const filters = { searchTerm: 'termo', page: 2, limit: 10 };
    faqRepository.findAllItems.mockResolvedValue(paginated);

    await expect(
      useCase.execute('org-1', filters),
    ).resolves.toEqual(paginated);

    expect(faqRepository.findAllItems).toHaveBeenCalledWith(
      filters,
      'org-1',
    );
  });

  it('deve propagar erro quando o repositório falhar', async () => {
    const error = new Error('Erro ao buscar items do FAQ');
    faqRepository.findAllItems.mockRejectedValue(error);

    await expect(useCase.execute('org-1')).rejects.toBe(error);
  });
});
