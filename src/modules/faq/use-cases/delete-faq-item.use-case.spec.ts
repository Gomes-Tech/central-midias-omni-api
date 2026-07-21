import { NotFoundException } from '@common/filters';
import { FaqRepository } from '../repository/faq.repository';
import { DeleteFaqItemUseCase } from './delete-faq-item.use-case';

describe('DeleteFaqItemUseCase', () => {
  let faqRepository: jest.Mocked<
    Pick<FaqRepository, 'findItemByIdOnly' | 'softDeleteItem'>
  >;
  let useCase: DeleteFaqItemUseCase;

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
      softDeleteItem: jest.fn(),
    };

    useCase = new DeleteFaqItemUseCase(
      faqRepository as unknown as FaqRepository,
    );
  });

  it('deve remover o item quando ele existir', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(item);
    faqRepository.softDeleteItem.mockResolvedValue(undefined);

    await expect(
      useCase.execute('item-1', 'org-1', 'user-1'),
    ).resolves.toBeUndefined();

    expect(faqRepository.findItemByIdOnly).toHaveBeenCalledWith(
      'item-1',
      'org-1',
    );
    expect(faqRepository.softDeleteItem).toHaveBeenCalledWith(
      'item-1',
      'org-1',
      'user-1',
    );
  });

  it('deve lançar NotFound quando o item não existir', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(null);

    await expect(
      useCase.execute('item-1', 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(faqRepository.softDeleteItem).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando o repositório falhar ao remover', async () => {
    const error = new Error('Erro ao remover item do FAQ');
    faqRepository.findItemByIdOnly.mockResolvedValue(item);
    faqRepository.softDeleteItem.mockRejectedValue(error);

    await expect(
      useCase.execute('item-1', 'org-1', 'user-1'),
    ).rejects.toBe(error);
  });
});
