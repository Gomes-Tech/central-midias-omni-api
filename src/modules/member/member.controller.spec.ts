import { PlatformPermissionGuard } from '@common/guards';
import { makeCreateUserDTO } from '@modules/user/use-cases/test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberController } from './member.controller';
import {
  AddUserMemberUseCase,
  CreateMemberWithUserUseCase,
  DeleteMemberUseCase,
  FindAllMembersUseCase,
  FindMemberByIdUseCase,
  FindMemberRoleUseCase,
  UpdateMemberUseCase,
} from './use-cases';

describe('MemberController', () => {
  let controller: MemberController;
  let addUserMemberUseCase: { execute: jest.Mock };
  let createMemberWithUserUseCase: { execute: jest.Mock };
  let findAllMembersUseCase: { execute: jest.Mock };
  let findMemberByIdUseCase: { execute: jest.Mock };
  let findMemberRoleUseCase: { execute: jest.Mock };
  let updateMemberUseCase: { execute: jest.Mock };
  let deleteMemberUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    addUserMemberUseCase = { execute: jest.fn() };
    createMemberWithUserUseCase = { execute: jest.fn() };
    findAllMembersUseCase = { execute: jest.fn() };
    findMemberByIdUseCase = { execute: jest.fn() };
    findMemberRoleUseCase = { execute: jest.fn() };
    updateMemberUseCase = { execute: jest.fn() };
    deleteMemberUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [
        { provide: AddUserMemberUseCase, useValue: addUserMemberUseCase },
        {
          provide: CreateMemberWithUserUseCase,
          useValue: createMemberWithUserUseCase,
        },
        { provide: FindAllMembersUseCase, useValue: findAllMembersUseCase },
        { provide: FindMemberByIdUseCase, useValue: findMemberByIdUseCase },
        {
          provide: FindMemberRoleUseCase,
          useValue: findMemberRoleUseCase,
        },
        { provide: UpdateMemberUseCase, useValue: updateMemberUseCase },
        { provide: DeleteMemberUseCase, useValue: deleteMemberUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<MemberController>(MemberController);
  });

  describe('findAll', () => {
    it('deve delegar ao FindAllMembersUseCase', async () => {
      const filters = { page: 1 };
      findAllMembersUseCase.execute.mockResolvedValue({ data: [] });

      await controller.findAll('org-1', filters);

      expect(findAllMembersUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        filters,
      );
    });

    it('deve usar filtros vazios quando query não for passada', async () => {
      findAllMembersUseCase.execute.mockResolvedValue({ data: [] });

      await controller.findAll('org-1');

      expect(findAllMembersUseCase.execute).toHaveBeenCalledWith('org-1', {});
    });
  });

  describe('findMyRole', () => {
    it('deve delegar ao FindMemberRoleUseCase', async () => {
      const role = {
        name: 'admin',
        label: 'Admin',
        canAccessBackoffice: true,
      };
      findMemberRoleUseCase.execute.mockResolvedValue(role);

      await controller.findMyRole('org-1', 'user-1');

      expect(findMemberRoleUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        'user-1',
      );
    });
  });

  describe('findById', () => {
    it('deve delegar ao FindMemberByIdUseCase', async () => {
      findMemberByIdUseCase.execute.mockResolvedValue({ id: 'm1' });

      await controller.findById('m1', 'org-1');

      expect(findMemberByIdUseCase.execute).toHaveBeenCalledWith(
        'm1',
        'org-1',
      );
    });
  });

  describe('createNew', () => {
    it('deve delegar ao CreateMemberWithUserUseCase', async () => {
      const dto = makeCreateUserDTO();
      createMemberWithUserUseCase.execute.mockResolvedValue({});

      await controller.createNew(dto, 'org-1', 'uid');

      expect(createMemberWithUserUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
      );
    });
  });

  describe('add', () => {
    it('deve delegar ao AddUserMemberUseCase', async () => {
      const dto = { userId: 'u1' } as Parameters<MemberController['add']>[0];
      addUserMemberUseCase.execute.mockResolvedValue(undefined);

      await controller.add(dto, 'org-1', 'uid');

      expect(addUserMemberUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
      );
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateMemberUseCase', async () => {
      const dto = { roleId: 'r1' } as Parameters<MemberController['update']>[1];
      updateMemberUseCase.execute.mockResolvedValue(undefined);

      await controller.update('m1', dto, 'org-1', 'uid');

      expect(updateMemberUseCase.execute).toHaveBeenCalledWith(
        'm1',
        'org-1',
        dto,
        'uid',
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteMemberUseCase', async () => {
      deleteMemberUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('m1', 'org-1');

      expect(deleteMemberUseCase.execute).toHaveBeenCalledWith('m1', 'org-1');
    });
  });
});
