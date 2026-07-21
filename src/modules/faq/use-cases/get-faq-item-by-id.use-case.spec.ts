import { NotFoundException } from '@common/filters';
import { FaqRepository } from '../repository/faq.repository';
import { GetFaqItemByIdUseCase } from './get-faq-item-by-id.use-case';

describe('GetFaqItemByIdUseCase', () => {
  let faqRepository: jest.Mocked<Pick<FaqRepository, 'findItemByIdOnly'>>;
  let useCase: GetFaqItemByIdUseCase;

  const item = {
    id: 'item-1',
    question: 'Pergunta',
    answer: 'Resposta',
    order: 1,
    faqId: 'faq-1',
    faqName: 'FAQ',
  };

  beforeEach(() => {
    faqRepository = {
      findItemByIdOnly: jest.fn(),
    };

    useCase = new GetFaqItemByIdUseCase(
      faqRepository as unknown as FaqRepository,
    );
  });

  it('deve retornar o item quando ele existir', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(item);

    await expect(
      useCase.execute('item-1', 'org-1'),
    ).resolves.toEqual(item);

    expect(faqRepository.findItemByIdOnly).toHaveBeenCalledWith(
      'item-1',
      'org-1',
    );
  });

  it('deve lançar NotFound quando o item não existir', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(null);

    await expect(
      useCase.execute('item-1', 'org-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      useCase.execute('item-1', 'org-1'),
    ).rejects.toThrow('Item do FAQ não encontrado');
  });

  it('deve propagar erro quando o repositório falhar', async () => {
    const error = new Error('Erro ao buscar item do FAQ');
    faqRepository.findItemByIdOnly.mockRejectedValue(error);

    await expect(useCase.execute('item-1', 'org-1')).rejects.toBe(error);
  });
});
