import { BadRequestException, NotFoundException } from '@common/filters';
import { FaqRepository } from '../repository/faq.repository';
import { UpdateFaqItemUseCase } from './update-faq-item.use-case';

describe('UpdateFaqItemUseCase', () => {
  let faqRepository: jest.Mocked<
    Pick<FaqRepository, 'findItemByIdOnly' | 'findItemByOrder' | 'updateItem'>
  >;
  let useCase: UpdateFaqItemUseCase;

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
      findItemByOrder: jest.fn(),
      updateItem: jest.fn(),
    };

    useCase = new UpdateFaqItemUseCase(
      faqRepository as unknown as FaqRepository,
    );
  });

  it('deve atualizar quando a nova ordem estiver livre', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(item);
    faqRepository.findItemByOrder.mockResolvedValue(null);

    await expect(
      useCase.execute('item-1', 'org-1', { order: 2 }, 'user-1'),
    ).resolves.toBeUndefined();

    expect(faqRepository.findItemByOrder).toHaveBeenCalledWith(
      2,
      'org-1',
      'faq-1',
      'item-1',
    );
    expect(faqRepository.updateItem).toHaveBeenCalledWith(
      'item-1',
      'org-1',
      { order: 2 },
      'user-1',
    );
  });

  it('deve bloquear quando a nova ordem estiver em uso no mesmo FAQ', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(item);
    faqRepository.findItemByOrder.mockResolvedValue({
      id: 'item-2',
      order: 2,
    });

    await expect(
      useCase.execute('item-1', 'org-1', { order: 2 }, 'user-1'),
    ).rejects.toThrow('Já existe um FAQ com esta ordem');

    expect(faqRepository.updateItem).not.toHaveBeenCalled();
  });

  it('não deve consultar conflito quando a ordem não for alterada', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(item);

    await useCase.execute('item-1', 'org-1', { order: 1 }, 'user-1');

    expect(faqRepository.findItemByOrder).not.toHaveBeenCalled();
    expect(faqRepository.updateItem).toHaveBeenCalled();
  });

  it('não deve consultar conflito quando a ordem não for informada', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(item);

    await useCase.execute(
      'item-1',
      'org-1',
      { question: 'Nova pergunta' },
      'user-1',
    );

    expect(faqRepository.findItemByOrder).not.toHaveBeenCalled();
    expect(faqRepository.updateItem).toHaveBeenCalled();
  });

  it('deve lançar NotFound quando o item não existir', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(null);

    await expect(
      useCase.execute('item-1', 'org-1', { order: 2 }, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(faqRepository.findItemByOrder).not.toHaveBeenCalled();
    expect(faqRepository.updateItem).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando houver conflito de ordem', async () => {
    faqRepository.findItemByIdOnly.mockResolvedValue(item);
    faqRepository.findItemByOrder.mockResolvedValue({
      id: 'item-2',
      order: 2,
    });

    await expect(
      useCase.execute('item-1', 'org-1', { order: 2 }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
