import { BadRequestException, NotFoundException } from '@common/filters';
import { FaqRepository } from '../repository/faq.repository';
import { CreateFaqItemUseCase } from './create-faq-item.use-case';

describe('CreateFaqItemUseCase', () => {
  let faqRepository: jest.Mocked<
    Pick<FaqRepository, 'existsById' | 'findItemByOrder' | 'createItem'>
  >;
  let useCase: CreateFaqItemUseCase;

  const data = {
    question: 'Como acessar?',
    answer: 'Pelo menu principal.',
    order: 1,
  };

  beforeEach(() => {
    faqRepository = {
      existsById: jest.fn(),
      findItemByOrder: jest.fn(),
      createItem: jest.fn(),
    };

    useCase = new CreateFaqItemUseCase(
      faqRepository as unknown as FaqRepository,
    );
  });

  it('deve criar quando a ordem estiver livre no FAQ da organização', async () => {
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.findItemByOrder.mockResolvedValue(null);
    faqRepository.createItem.mockResolvedValue({ id: 'item-1' });

    await expect(useCase.execute('org-1', data, 'user-1')).resolves.toEqual({
      id: 'item-1',
    });

    expect(faqRepository.findItemByOrder).toHaveBeenCalledWith(
      1,
      'org-1',
      'faq-1',
    );
    expect(faqRepository.createItem).toHaveBeenCalledWith(
      'faq-1',
      'org-1',
      data,
      'user-1',
    );
  });

  it('deve bloquear quando a ordem já estiver em uso no mesmo FAQ', async () => {
    faqRepository.existsById.mockResolvedValue({ id: 'faq-1' });
    faqRepository.findItemByOrder.mockResolvedValue({
      id: 'item-existente',
      order: 1,
    });

    const result = useCase.execute('org-1', data, 'user-1');

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow('Já existe um FAQ com esta ordem');
    expect(faqRepository.createItem).not.toHaveBeenCalled();
  });

  it('deve lançar NotFound quando a organização não possuir FAQ', async () => {
    faqRepository.existsById.mockResolvedValue(null);

    await expect(
      useCase.execute('org-1', data, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(faqRepository.findItemByOrder).not.toHaveBeenCalled();
    expect(faqRepository.createItem).not.toHaveBeenCalled();
  });
});
