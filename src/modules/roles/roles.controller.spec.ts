import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import {
  makeCreateGlobalRoleDTO,
  makeCreateRoleDTO,
  makeUpdateGlobalRoleDTO,
  makeUpdateRoleDTO,
} from './use-cases/test-helpers';
import {
  CreateGlobalRoleUseCase,
  CreateRoleUseCase,
  DeleteGlobalRoleUseCase,
  DeleteRoleUseCase,
  FindAllGlobalRolesSelectUseCase,
  FindAllRolePermissionsUseCase,
  FindAllRolesUseCase,
  FindAllSelectRolesUseCase,
  FindGlobalRoleByIdUseCase,
  FindRoleByIdUseCase,
  UpdateGlobalRoleUseCase,
  UpdateRoleUseCase,
} from './use-cases';

describe('RolesController', () => {
  let controller: RolesController;
  let findAllRolesUseCase: { execute: jest.Mock };
  let findAllRolePermissionsUseCase: { execute: jest.Mock };
  let findAllSelectRolesUseCase: { execute: jest.Mock };
  let findRoleByIdUseCase: { execute: jest.Mock };
  let createRoleUseCase: { execute: jest.Mock };
  let createGlobalRoleUseCase: { execute: jest.Mock };
  let findGlobalRoleByIdUseCase: { execute: jest.Mock };
  let updateGlobalRoleUseCase: { execute: jest.Mock };
  let deleteGlobalRoleUseCase: { execute: jest.Mock };
  let updateRoleUseCase: { execute: jest.Mock };
  let deleteRoleUseCase: { execute: jest.Mock };
  let findAllGlobalRolesSelectUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    findAllRolesUseCase = { execute: jest.fn() };
    findAllRolePermissionsUseCase = { execute: jest.fn() };
    findAllSelectRolesUseCase = { execute: jest.fn() };
    findRoleByIdUseCase = { execute: jest.fn() };
    createRoleUseCase = { execute: jest.fn() };
    createGlobalRoleUseCase = { execute: jest.fn() };
    findGlobalRoleByIdUseCase = { execute: jest.fn() };
    updateGlobalRoleUseCase = { execute: jest.fn() };
    deleteGlobalRoleUseCase = { execute: jest.fn() };
    updateRoleUseCase = { execute: jest.fn() };
    deleteRoleUseCase = { execute: jest.fn() };
    findAllGlobalRolesSelectUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: FindAllRolesUseCase, useValue: findAllRolesUseCase },
        {
          provide: FindAllRolePermissionsUseCase,
          useValue: findAllRolePermissionsUseCase,
        },
        {
          provide: FindAllSelectRolesUseCase,
          useValue: findAllSelectRolesUseCase,
        },
        { provide: FindRoleByIdUseCase, useValue: findRoleByIdUseCase },
        { provide: CreateRoleUseCase, useValue: createRoleUseCase },
        { provide: CreateGlobalRoleUseCase, useValue: createGlobalRoleUseCase },
        {
          provide: FindGlobalRoleByIdUseCase,
          useValue: findGlobalRoleByIdUseCase,
        },
        {
          provide: UpdateGlobalRoleUseCase,
          useValue: updateGlobalRoleUseCase,
        },
        {
          provide: DeleteGlobalRoleUseCase,
          useValue: deleteGlobalRoleUseCase,
        },
        { provide: UpdateRoleUseCase, useValue: updateRoleUseCase },
        { provide: DeleteRoleUseCase, useValue: deleteRoleUseCase },
        {
          provide: FindAllGlobalRolesSelectUseCase,
          useValue: findAllGlobalRolesSelectUseCase,
        },
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

      expect(findAllSelectRolesUseCase.execute).toHaveBeenCalledWith(false);
    });
  });

  describe('findAllPermissions', () => {
    it('deve delegar ao FindAllRolePermissionsUseCase com organizationId e filtros', async () => {
      const filters = { page: 2, searchTerm: 'editor' };
      findAllRolePermissionsUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        currentPage: 2,
        totalPages: 0,
      });

      await controller.findAllPermissions('org-1', filters);

      expect(findAllRolePermissionsUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        filters,
      );
    });

    it('deve usar filtros vazios por padrão', async () => {
      findAllRolePermissionsUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        currentPage: 1,
        totalPages: 0,
      });

      await controller.findAllPermissions('org-1');

      expect(findAllRolePermissionsUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        {},
      );
    });
  });

  describe('findById', () => {
    it('deve delegar ao FindRoleByIdUseCase', async () => {
      findRoleByIdUseCase.execute.mockResolvedValue({ id: 'r1' });

      await controller.findById('r1', 'org-1');

      expect(findRoleByIdUseCase.execute).toHaveBeenCalledWith('r1', 'org-1');
    });
  });

  describe('findGlobalRoleById', () => {
    it('deve delegar ao FindGlobalRoleByIdUseCase sem organizationId', async () => {
      findGlobalRoleByIdUseCase.execute.mockResolvedValue({ id: 'r-global' });

      await controller.findGlobalRoleById('r-global');

      expect(findGlobalRoleByIdUseCase.execute).toHaveBeenCalledWith(
        'r-global',
      );
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

  describe('updateGlobalRole', () => {
    it('deve delegar ao UpdateGlobalRoleUseCase sem organizationId', async () => {
      const dto = makeUpdateGlobalRoleDTO({
        permissions: [{ moduleId: 'mod-1', action: 'READ' }],
      });
      updateGlobalRoleUseCase.execute.mockResolvedValue({});

      await controller.updateGlobalRole('r-global', dto);

      expect(updateGlobalRoleUseCase.execute).toHaveBeenCalledWith(
        'r-global',
        dto,
      );
    });
  });

  describe('deleteGlobalRole', () => {
    it('deve delegar ao DeleteGlobalRoleUseCase sem organizationId', async () => {
      deleteGlobalRoleUseCase.execute.mockResolvedValue(undefined);

      await controller.deleteGlobalRole('r-global');

      expect(deleteGlobalRoleUseCase.execute).toHaveBeenCalledWith('r-global');
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

      await controller.update('r1', dto, 'org-1');

      expect(updateRoleUseCase.execute).toHaveBeenCalledWith(
        'r1',
        dto,
        'org-1',
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteRoleUseCase', async () => {
      deleteRoleUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('r1', 'org-1');

      expect(deleteRoleUseCase.execute).toHaveBeenCalledWith('r1', 'org-1');
    });
  });
});
