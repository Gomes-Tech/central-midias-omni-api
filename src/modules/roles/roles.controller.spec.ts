import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import {
  makeCreateGlobalRoleDTO,
  makeCreateRoleDTO,
  makeUpdateRoleDTO,
} from './use-cases/test-helpers';
import {
  CreateGlobalRoleUseCase,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  FindAllRolesUseCase,
  FindAllSelectRolesUseCase,
  FindRoleByIdUseCase,
  UpdateRoleUseCase,
} from './use-cases';

describe('RolesController', () => {
  let controller: RolesController;
  let findAllRolesUseCase: { execute: jest.Mock };
  let findAllSelectRolesUseCase: { execute: jest.Mock };
  let findRoleByIdUseCase: { execute: jest.Mock };
  let createRoleUseCase: { execute: jest.Mock };
  let createGlobalRoleUseCase: { execute: jest.Mock };
  let updateRoleUseCase: { execute: jest.Mock };
  let deleteRoleUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    findAllRolesUseCase = { execute: jest.fn() };
    findAllSelectRolesUseCase = { execute: jest.fn() };
    findRoleByIdUseCase = { execute: jest.fn() };
    createRoleUseCase = { execute: jest.fn() };
    createGlobalRoleUseCase = { execute: jest.fn() };
    updateRoleUseCase = { execute: jest.fn() };
    deleteRoleUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: FindAllRolesUseCase, useValue: findAllRolesUseCase },
        {
          provide: FindAllSelectRolesUseCase,
          useValue: findAllSelectRolesUseCase,
        },
        { provide: FindRoleByIdUseCase, useValue: findRoleByIdUseCase },
        { provide: CreateRoleUseCase, useValue: createRoleUseCase },
        { provide: CreateGlobalRoleUseCase, useValue: createGlobalRoleUseCase },
        { provide: UpdateRoleUseCase, useValue: updateRoleUseCase },
        { provide: DeleteRoleUseCase, useValue: deleteRoleUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<RolesController>(RolesController);
  });

  describe('findAll', () => {
    it('deve delegar ao FindAllRolesUseCase com filtros', async () => {
      const filters = { label: 'adm' };
      findAllRolesUseCase.execute.mockResolvedValue([]);

      await controller.findAll(filters);

      expect(findAllRolesUseCase.execute).toHaveBeenCalledWith(filters);
    });

    it('deve usar filtros vazios quando query não for passada', async () => {
      findAllRolesUseCase.execute.mockResolvedValue([]);

      await controller.findAll();

      expect(findAllRolesUseCase.execute).toHaveBeenCalledWith({});
    });
  });

  describe('findAllSelect', () => {
    it('deve delegar ao FindAllSelectRolesUseCase', async () => {
      findAllSelectRolesUseCase.execute.mockResolvedValue([]);

      await controller.findAllSelect();

      expect(findAllSelectRolesUseCase.execute).toHaveBeenCalledWith();
    });
  });

  describe('findById', () => {
    it('deve delegar ao FindRoleByIdUseCase', async () => {
      findRoleByIdUseCase.execute.mockResolvedValue({ id: 'r1' });

      await controller.findById('r1');

      expect(findRoleByIdUseCase.execute).toHaveBeenCalledWith('r1');
    });
  });

  describe('create', () => {
    it('deve delegar ao CreateGlobalRoleUseCase', async () => {
      const dto = makeCreateGlobalRoleDTO();
      createGlobalRoleUseCase.execute.mockResolvedValue({});

      await controller.create(dto);

      expect(createGlobalRoleUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('createPermissions', () => {
    it('deve delegar ao CreateRoleUseCase com organizationId', async () => {
      const dto = makeCreateRoleDTO();
      createRoleUseCase.execute.mockResolvedValue({});

      await controller.createPermissions(dto, 'org-1');

      expect(createRoleUseCase.execute).toHaveBeenCalledWith(dto, 'org-1');
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateRoleUseCase', async () => {
      const dto = makeUpdateRoleDTO();
      updateRoleUseCase.execute.mockResolvedValue({});

      await controller.update('r1', dto);

      expect(updateRoleUseCase.execute).toHaveBeenCalledWith('r1', dto);
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteRoleUseCase', async () => {
      deleteRoleUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('r1');

      expect(deleteRoleUseCase.execute).toHaveBeenCalledWith('r1');
    });
  });
});
