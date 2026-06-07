import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import {
  CreateGlobalUserUseCase,
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  GetMeUseCase,
  UpdateUserUseCase,
} from './use-cases';
import {
  makeCreateGlobalUserDTO,
  makeCreateUserDTO,
  makeUpdateUserDTO,
} from './use-cases/test-helpers';

describe('UserController', () => {
  let controller: UserController;
  let findAllUsersUseCase: { execute: jest.Mock };
  let findUserByIdUseCase: { execute: jest.Mock };
  let getMeUseCase: { execute: jest.Mock };
  let createUserUseCase: { execute: jest.Mock };
  let createGlobalUserUseCase: { execute: jest.Mock };
  let updateUserUseCase: { execute: jest.Mock };
  let deleteUserUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    findAllUsersUseCase = { execute: jest.fn() };
    findUserByIdUseCase = { execute: jest.fn() };
    getMeUseCase = { execute: jest.fn() };
    createUserUseCase = { execute: jest.fn() };
    createGlobalUserUseCase = { execute: jest.fn() };
    updateUserUseCase = { execute: jest.fn() };
    deleteUserUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: CreateUserUseCase, useValue: createUserUseCase },
        { provide: CreateGlobalUserUseCase, useValue: createGlobalUserUseCase },
        { provide: FindAllUsersUseCase, useValue: findAllUsersUseCase },
        { provide: FindUserByIdUseCase, useValue: findUserByIdUseCase },
        { provide: GetMeUseCase, useValue: getMeUseCase },
        { provide: UpdateUserUseCase, useValue: updateUserUseCase },
        { provide: DeleteUserUseCase, useValue: deleteUserUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<UserController>(UserController);
  });

  describe('getList', () => {
    it('deve repassar filtros e organizationId para o use case', async () => {
      const payload = { data: [], total: 0, page: 1, totalPages: 0 };
      const filters = {
        page: 2,
        limit: 20,
        searchTerm: 'busca',
        role: 'r1',
        platformRoleId: 'pr1',
        platformRoleName: 'Admin',
        companyId: 'c1',
        organizationId: 'o1',
        managerId: 'm1',
        isActive: true,
      };
      findAllUsersUseCase.execute.mockResolvedValue(payload);

      const result = await controller.getList(filters, 'org-ctx');

      expect(result).toBe(payload);
      expect(findAllUsersUseCase.execute).toHaveBeenCalledWith(
        filters,
        'org-ctx',
      );
    });

    it('deve usar filtros vazios quando query não for passada', async () => {
      findAllUsersUseCase.execute.mockResolvedValue({});

      await controller.getList(undefined, 'org-ctx');

      expect(findAllUsersUseCase.execute).toHaveBeenCalledWith({}, 'org-ctx');
    });
  });

  describe('findById', () => {
    it('deve remover password do usuário retornado', async () => {
      const user = {
        id: 'u1',
        name: 'X',
        password: 'secret',
      };
      findUserByIdUseCase.execute.mockResolvedValue(user);

      const result = await controller.findById('u1');

      expect(findUserByIdUseCase.execute).toHaveBeenCalledWith('u1');
      expect(result).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('password');
    });
  });

  describe('getMe', () => {
    it('deve delegar ao GetMeUseCase com userId', async () => {
      const payload = { name: 'Eu', email: 'eu@test.com', avatarUrl: null };
      getMeUseCase.execute.mockResolvedValue(payload);

      const result = await controller.getMe('me');

      expect(getMeUseCase.execute).toHaveBeenCalledWith('me');
      expect(result).toBe(payload);
    });
  });

  describe('create', () => {
    it('deve delegar ao CreateUserUseCase', async () => {
      const dto = makeCreateUserDTO();
      createUserUseCase.execute.mockResolvedValue(undefined);

      await controller.create(dto, 'uid', 'org-id');

      expect(createUserUseCase.execute).toHaveBeenCalledWith(
        dto,
        'uid',
        'org-id',
      );
    });
  });

  describe('createGlobal', () => {
    it('deve delegar ao CreateGlobalUserUseCase', async () => {
      const dto = makeCreateGlobalUserDTO();
      createGlobalUserUseCase.execute.mockResolvedValue(undefined);

      await controller.createGlobal(dto, 'admin-id');

      expect(createGlobalUserUseCase.execute).toHaveBeenCalledWith(
        dto,
        'admin-id',
      );
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateUserUseCase', async () => {
      const dto = makeUpdateUserDTO();
      updateUserUseCase.execute.mockResolvedValue(undefined);

      await controller.update('user-1', dto, 'editor');

      expect(updateUserUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        dto,
        'editor',
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteUserUseCase', async () => {
      deleteUserUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('user-1');

      expect(deleteUserUseCase.execute).toHaveBeenCalledWith('user-1');
    });
  });
});
