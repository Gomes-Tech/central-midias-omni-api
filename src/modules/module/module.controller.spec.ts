import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleController } from './module.controller';
import {
  CreateModuleUseCase,
  DeleteModuleUseCase,
  FindAllModuleUseCase,
  FindModuleByIdUseCase,
  UpdateModuleUseCase,
} from './use-cases';
import { makeCreateModuleDTO, makeUpdateModuleDTO } from './use-cases/test-helpers';

describe('ModuleController', () => {
  let controller: ModuleController;
  let findAllModuleUseCase: { execute: jest.Mock };
  let findModuleByIdUseCase: { execute: jest.Mock };
  let createModuleUseCase: { execute: jest.Mock };
  let updateModuleUseCase: { execute: jest.Mock };
  let deleteModuleUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    findAllModuleUseCase = { execute: jest.fn() };
    findModuleByIdUseCase = { execute: jest.fn() };
    createModuleUseCase = { execute: jest.fn() };
    updateModuleUseCase = { execute: jest.fn() };
    deleteModuleUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModuleController],
      providers: [
        { provide: FindAllModuleUseCase, useValue: findAllModuleUseCase },
        { provide: FindModuleByIdUseCase, useValue: findModuleByIdUseCase },
        { provide: CreateModuleUseCase, useValue: createModuleUseCase },
        { provide: UpdateModuleUseCase, useValue: updateModuleUseCase },
        { provide: DeleteModuleUseCase, useValue: deleteModuleUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<ModuleController>(ModuleController);
  });

  describe('findAll', () => {
    it('deve delegar ao FindAllModuleUseCase', async () => {
      findAllModuleUseCase.execute.mockResolvedValue([]);

      await controller.findAll();

      expect(findAllModuleUseCase.execute).toHaveBeenCalledWith();
    });
  });

  describe('findById', () => {
    it('deve delegar ao FindModuleByIdUseCase', async () => {
      findModuleByIdUseCase.execute.mockResolvedValue({ id: 'm1' });

      await controller.findById('m1');

      expect(findModuleByIdUseCase.execute).toHaveBeenCalledWith('m1');
    });
  });

  describe('create', () => {
    it('deve delegar ao CreateModuleUseCase', async () => {
      const dto = makeCreateModuleDTO();
      createModuleUseCase.execute.mockResolvedValue({ id: 'm1' });

      await controller.create(dto);

      expect(createModuleUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateModuleUseCase', async () => {
      const dto = makeUpdateModuleDTO();
      updateModuleUseCase.execute.mockResolvedValue({ id: 'm1' });

      await controller.update('m1', dto);

      expect(updateModuleUseCase.execute).toHaveBeenCalledWith('m1', dto);
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteModuleUseCase', async () => {
      deleteModuleUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('m1');

      expect(deleteModuleUseCase.execute).toHaveBeenCalledWith('m1');
    });
  });
});
