import { FaqRepository } from '../repository/faq.repository';
import { FindAllFaqsUseCase } from './find-all-faqs.use-case';

describe('FindAllFaqsUseCase', () => {
  let faqRepository: jest.Mocked<Pick<FaqRepository, 'findAll'>>;
  let useCase: FindAllFaqsUseCase;

  const paginated = {
    data: [{ id: 'faq-1', name: 'FAQ', order: 1, isActive: true }],
    total: 1,
    page: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    faqRepository = {
      findAll: jest.fn(),
    };

    useCase = new FindAllFaqsUseCase(
      faqRepository as unknown as FaqRepository,
    );
  });

  it('deve usar filtros vazios quando não informados', async () => {
    faqRepository.findAll.mockResolvedValue(paginated);

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(faqRepository.findAll).toHaveBeenCalledWith({}, 'org-1');
  });

  it('deve delegar ao repositório com os filtros informados', async () => {
    const filters = { searchTerm: 'termo', onlyActive: true };
    faqRepository.findAll.mockResolvedValue(paginated);

    await expect(
      useCase.execute('org-1', filters),
    ).resolves.toEqual(paginated);

    expect(faqRepository.findAll).toHaveBeenCalledWith(filters, 'org-1');
  });

  it('deve propagar erro quando o repositório falhar', async () => {
    const error = new Error('Erro ao buscar FAQs');
    faqRepository.findAll.mockRejectedValue(error);

    await expect(useCase.execute('org-1')).rejects.toBe(error);
  });
});
