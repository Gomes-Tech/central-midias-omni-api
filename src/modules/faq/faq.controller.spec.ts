import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { FaqController } from './faq.controller';
import {
  CreateFaqItemUseCase,
  CreateFaqUseCase,
  DeleteFaqItemUseCase,
  DeleteFaqUseCase,
  FindAllFaqItemsUseCase,
  FindAllFaqsUseCase,
  GetFaqItemByIdUseCase,
  GetFaqUseCase,
  UpdateFaqItemUseCase,
  UpdateFaqUseCase,
  UpsertFaqDetailUseCase,
} from './use-cases';

describe('FaqController', () => {
  let controller: FaqController;
  let findAllFaqsUseCase: { execute: jest.Mock };
  let findAllFaqItemsUseCase: { execute: jest.Mock };
  let getFaqUseCase: { execute: jest.Mock };
  let getFaqItemByIdUseCase: { execute: jest.Mock };
  let createFaqUseCase: { execute: jest.Mock };
  let updateFaqUseCase: { execute: jest.Mock };
  let deleteFaqUseCase: { execute: jest.Mock };
  let createFaqItemUseCase: { execute: jest.Mock };
  let updateFaqItemUseCase: { execute: jest.Mock };
  let deleteFaqItemUseCase: { execute: jest.Mock };
  let upsertFaqDetailUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    findAllFaqsUseCase = { execute: jest.fn() };
    findAllFaqItemsUseCase = { execute: jest.fn() };
    getFaqUseCase = { execute: jest.fn() };
    getFaqItemByIdUseCase = { execute: jest.fn() };
    createFaqUseCase = { execute: jest.fn() };
    updateFaqUseCase = { execute: jest.fn() };
    deleteFaqUseCase = { execute: jest.fn() };
    createFaqItemUseCase = { execute: jest.fn() };
    updateFaqItemUseCase = { execute: jest.fn() };
    deleteFaqItemUseCase = { execute: jest.fn() };
    upsertFaqDetailUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaqController],
      providers: [
        { provide: FindAllFaqsUseCase, useValue: findAllFaqsUseCase },
        { provide: FindAllFaqItemsUseCase, useValue: findAllFaqItemsUseCase },
        { provide: GetFaqUseCase, useValue: getFaqUseCase },
        { provide: GetFaqItemByIdUseCase, useValue: getFaqItemByIdUseCase },
        { provide: CreateFaqUseCase, useValue: createFaqUseCase },
        { provide: UpdateFaqUseCase, useValue: updateFaqUseCase },
        { provide: DeleteFaqUseCase, useValue: deleteFaqUseCase },
        { provide: CreateFaqItemUseCase, useValue: createFaqItemUseCase },
        { provide: UpdateFaqItemUseCase, useValue: updateFaqItemUseCase },
        { provide: DeleteFaqItemUseCase, useValue: deleteFaqItemUseCase },
        { provide: UpsertFaqDetailUseCase, useValue: upsertFaqDetailUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<FaqController>(FaqController);
  });

  describe('list', () => {
    it('deve usar filtros vazios quando query não for passada', async () => {
      findAllFaqsUseCase.execute.mockResolvedValue({ data: [], total: 0 });

      await controller.list('org-1');

      expect(findAllFaqsUseCase.execute).toHaveBeenCalledWith('org-1', {});
    });

    it('deve delegar ao FindAllFaqsUseCase com org e filtros', async () => {
      const payload = { data: [], total: 0, page: 1, totalPages: 0 };
      const filters = { searchTerm: 'termo' };
      findAllFaqsUseCase.execute.mockResolvedValue(payload);

      const result = await controller.list('org-1', filters);

      expect(result).toBe(payload);
      expect(findAllFaqsUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        filters,
      );
    });
  });

  describe('get', () => {
    it('deve delegar ao GetFaqUseCase', async () => {
      const faq = { id: 'faq-1', name: 'FAQ', order: 1, isActive: true, detail: null };
      getFaqUseCase.execute.mockResolvedValue(faq);

      const result = await controller.get('org-1');

      expect(result).toBe(faq);
      expect(getFaqUseCase.execute).toHaveBeenCalledWith('org-1');
    });
  });

  describe('listItems', () => {
    it('deve usar filtros vazios quando query não for passada', async () => {
      findAllFaqItemsUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.listItems('org-1');

      expect(findAllFaqItemsUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        {},
      );
    });

    it('deve delegar ao FindAllFaqItemsUseCase com org e filtros', async () => {
      const payload = { data: [], total: 0, page: 1, totalPages: 0 };
      const filters = { searchTerm: 'termo' };
      findAllFaqItemsUseCase.execute.mockResolvedValue(payload);

      const result = await controller.listItems('org-1', filters);

      expect(result).toBe(payload);
      expect(findAllFaqItemsUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        filters,
      );
    });
  });

  describe('createItem', () => {
    it('deve delegar ao CreateFaqItemUseCase', async () => {
      const dto = { question: 'Pergunta', answer: 'Resposta', order: 1 };
      createFaqItemUseCase.execute.mockResolvedValue({ id: 'item-1' });

      const result = await controller.createItem('org-1', dto, 'user-1');

      expect(result).toEqual({ id: 'item-1' });
      expect(createFaqItemUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'user-1',
      );
    });
  });

  describe('getItemById', () => {
    it('deve delegar ao GetFaqItemByIdUseCase', async () => {
      const item = {
        id: 'item-1',
        question: 'Pergunta',
        answer: 'Resposta',
        order: 1,
        faqId: 'faq-1',
        faqName: 'FAQ',
      };
      getFaqItemByIdUseCase.execute.mockResolvedValue(item);

      const result = await controller.getItemById('item-1', 'org-1');

      expect(result).toBe(item);
      expect(getFaqItemByIdUseCase.execute).toHaveBeenCalledWith(
        'item-1',
        'org-1',
      );
    });
  });

  describe('updateItem', () => {
    it('deve delegar ao UpdateFaqItemUseCase', async () => {
      const dto = { question: 'Nova pergunta' };
      updateFaqItemUseCase.execute.mockResolvedValue(undefined);

      await controller.updateItem('item-1', 'org-1', dto, 'user-1');

      expect(updateFaqItemUseCase.execute).toHaveBeenCalledWith(
        'item-1',
        'org-1',
        dto,
        'user-1',
      );
    });
  });

  describe('deleteItem', () => {
    it('deve delegar ao DeleteFaqItemUseCase', async () => {
      deleteFaqItemUseCase.execute.mockResolvedValue(undefined);

      await controller.deleteItem('item-1', 'org-1', 'user-1');

      expect(deleteFaqItemUseCase.execute).toHaveBeenCalledWith(
        'item-1',
        'org-1',
        'user-1',
      );
    });
  });

  describe('create', () => {
    it('deve delegar ao CreateFaqUseCase', async () => {
      const dto = { name: 'FAQ', order: 1 };
      createFaqUseCase.execute.mockResolvedValue({ id: 'faq-1' });

      const result = await controller.create('org-1', dto, 'user-1');

      expect(result).toEqual({ id: 'faq-1' });
      expect(createFaqUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'user-1',
      );
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateFaqUseCase', async () => {
      const dto = { name: 'Novo nome' };
      updateFaqUseCase.execute.mockResolvedValue(undefined);

      await controller.update('faq-1', 'org-1', dto, 'user-1');

      expect(updateFaqUseCase.execute).toHaveBeenCalledWith(
        'faq-1',
        'org-1',
        dto,
        'user-1',
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteFaqUseCase', async () => {
      deleteFaqUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('faq-1', 'org-1', 'user-1');

      expect(deleteFaqUseCase.execute).toHaveBeenCalledWith(
        'faq-1',
        'org-1',
        'user-1',
      );
    });
  });

  describe('upsertDetail', () => {
    it('deve delegar ao UpsertFaqDetailUseCase sem arquivo', async () => {
      const dto = { description: 'Descrição' };
      upsertFaqDetailUseCase.execute.mockResolvedValue(undefined);

      await controller.upsertDetail('faq-1', 'org-1', dto, 'user-1');

      expect(upsertFaqDetailUseCase.execute).toHaveBeenCalledWith(
        'faq-1',
        'org-1',
        dto,
        'user-1',
        undefined,
      );
    });

    it('deve delegar ao UpsertFaqDetailUseCase com arquivo', async () => {
      const dto = { description: 'Descrição' };
      const file = { originalname: 'imagem.png' } as Express.Multer.File;
      upsertFaqDetailUseCase.execute.mockResolvedValue(undefined);

      await controller.upsertDetail('faq-1', 'org-1', dto, 'user-1', file);

      expect(upsertFaqDetailUseCase.execute).toHaveBeenCalledWith(
        'faq-1',
        'org-1',
        dto,
        'user-1',
        file,
      );
    });
  });
});
