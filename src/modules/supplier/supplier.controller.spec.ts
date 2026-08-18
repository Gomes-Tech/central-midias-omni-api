import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from './supplier.controller';
import {
  GetSupplierDocumentUseCase,
  UpsertSupplierDocumentUseCase,
} from './use-cases';

describe('SupplierController', () => {
  let controller: SupplierController;
  let getSupplierDocumentUseCase: { execute: jest.Mock };
  let upsertSupplierDocumentUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    getSupplierDocumentUseCase = { execute: jest.fn() };
    upsertSupplierDocumentUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [
        {
          provide: GetSupplierDocumentUseCase,
          useValue: getSupplierDocumentUseCase,
        },
        {
          provide: UpsertSupplierDocumentUseCase,
          useValue: upsertSupplierDocumentUseCase,
        },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<SupplierController>(SupplierController);
  });

  describe('get', () => {
    it('deve delegar ao GetSupplierDocumentUseCase', async () => {
      const payload = { url: 'https://cdn.test/suppliers/lista.pdf' };
      getSupplierDocumentUseCase.execute.mockResolvedValue(payload);

      const result = await controller.get('org-1', 'user-1');

      expect(result).toBe(payload);
      expect(getSupplierDocumentUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        'user-1',
      );
    });
  });

  describe('upsert', () => {
    it('deve delegar ao UpsertSupplierDocumentUseCase sem arquivo', async () => {
      upsertSupplierDocumentUseCase.execute.mockResolvedValue(undefined);

      await controller.upsert('org-1', 'user-1');

      expect(upsertSupplierDocumentUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        'user-1',
        undefined,
      );
    });

    it('deve delegar ao UpsertSupplierDocumentUseCase com arquivo', async () => {
      const file = { originalname: 'fornecedores.pdf' } as Express.Multer.File;
      upsertSupplierDocumentUseCase.execute.mockResolvedValue(undefined);

      await controller.upsert('org-1', 'user-1', file);

      expect(upsertSupplierDocumentUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        'user-1',
        file,
      );
    });
  });
});
