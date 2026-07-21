import { BadRequestException, NotFoundException } from '@common/filters';
import { SyncGlobalRoleCategoryAccessesUseCase } from '@modules/category-role-access/use-cases/sync-global-role-category-accesses.use-case';
import { FindGlobalRoleByIdUseCase } from '@modules/roles/use-cases/find-global-role-by-id.use-case';
import { FindRoleByIdUseCase } from '@modules/roles/use-cases/find-role-by-id.use-case';
import { UserById } from '@modules/user/entities';
import { FindUserByIdUseCase } from '@modules/user/use-cases/find-user-by-id.use-case';
import { MemberRepository } from '../repository';
import { AddUserMemberUseCase } from './add-user-member.use-case';
import { makeCreateMemberDTO } from './test-helpers';

function makeMemberUser(overrides: Partial<UserById> = {}): UserById {
  return {
    id: 'user-id',
    name: 'Usuário',
    email: 'user@example.com',
    taxIdentifier: '12345678901',
    password: 'hashed-password',
    phone: null,
    socialReason: null,
    city: null,
    uf: null,
    avatarKey: null,
    isFirstAccess: false,
    isActive: true,
    isDeleted: false,
    canAccessBackoffice: false,
    globalRoleId: null,
    ...overrides,
  };
}

describe('AddUserMemberUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let findRoleByIdUseCase: jest.Mocked<FindRoleByIdUseCase>;
  let findGlobalRoleByIdUseCase: jest.Mocked<FindGlobalRoleByIdUseCase>;
  let syncGlobalRoleCategoryAccessesUseCase: jest.Mocked<SyncGlobalRoleCategoryAccessesUseCase>;
  let useCase: AddUserMemberUseCase;

  beforeEach(() => {
    memberRepository = {
      findByOrganizationAndUser: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<MemberRepository>;

    findUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;

    findRoleByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindRoleByIdUseCase>;

    findGlobalRoleByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindGlobalRoleByIdUseCase>;

    syncGlobalRoleCategoryAccessesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SyncGlobalRoleCategoryAccessesUseCase>;

    useCase = new AddUserMemberUseCase(
      memberRepository,
      findUserByIdUseCase,
      findRoleByIdUseCase,
      findGlobalRoleByIdUseCase,
      syncGlobalRoleCategoryAccessesUseCase,
    );
  });

  it('deve criar vínculo quando usuário estiver ativo e sem duplicidade', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeMemberUser({
      id: dto.userId,
      isActive: true,
      isDeleted: false,
    });

    memberRepository.findByOrganizationAndUser.mockResolvedValue(null);
    findUserByIdUseCase.execute.mockResolvedValue(user);
    findRoleByIdUseCase.execute.mockResolvedValue({
      canAccessBackoffice: false,
    } as never);
    memberRepository.create.mockResolvedValue(undefined);

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).resolves.toBeUndefined();

    expect(memberRepository.findByOrganizationAndUser).toHaveBeenCalledWith(
      'org-id',
      dto.userId,
    );
    expect(findUserByIdUseCase.execute).toHaveBeenCalledWith(dto.userId);
    expect(findRoleByIdUseCase.execute).toHaveBeenCalledWith(
      dto.roleId,
      'org-id',
    );
    expect(memberRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'requester-id',
    );
  });

  it('deve lançar erro quando já existir membro para o usuário na organização', async () => {
    const dto = makeCreateMemberDTO();

    memberRepository.findByOrganizationAndUser.mockResolvedValue({
      id: 'existing',
    });

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findUserByIdUseCase.execute).not.toHaveBeenCalled();
    expect(memberRepository.create).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando usuário estiver inativo', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeMemberUser({
      id: dto.userId,
      isActive: false,
      isDeleted: false,
    });

    memberRepository.findByOrganizationAndUser.mockResolvedValue(null);
    findUserByIdUseCase.execute.mockResolvedValue(user);

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findRoleByIdUseCase.execute).not.toHaveBeenCalled();
    expect(memberRepository.create).not.toHaveBeenCalled();
  });

  it('deve aceitar perfil global quando não houver vínculo de categoria na organização', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeMemberUser({
      id: dto.userId,
      isActive: true,
      isDeleted: false,
      canAccessBackoffice: true,
      globalRoleId: 'global-role-id',
    });

    memberRepository.findByOrganizationAndUser.mockResolvedValue(null);
    findUserByIdUseCase.execute.mockResolvedValue(user);
    findRoleByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Perfil não encontrado'),
    );
    findGlobalRoleByIdUseCase.execute.mockResolvedValue({
      canAccessBackoffice: true,
    } as never);
    memberRepository.create.mockResolvedValue(undefined);

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).resolves.toBeUndefined();

    expect(findGlobalRoleByIdUseCase.execute).toHaveBeenCalledWith(dto.roleId);
    expect(syncGlobalRoleCategoryAccessesUseCase.execute).toHaveBeenCalledWith(
      dto.roleId,
      'org-id',
    );
    expect(memberRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'requester-id',
    );
  });

  it('deve lançar erro quando usuário estiver removido (soft delete)', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeMemberUser({
      id: dto.userId,
      isActive: true,
      isDeleted: true,
    });

    memberRepository.findByOrganizationAndUser.mockResolvedValue(null);
    findUserByIdUseCase.execute.mockResolvedValue(user);

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(memberRepository.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar usuário global com perfil comum', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeMemberUser({
      id: dto.userId,
      canAccessBackoffice: true,
      globalRoleId: 'global-role-id',
    });

    memberRepository.findByOrganizationAndUser.mockResolvedValue(null);
    findUserByIdUseCase.execute.mockResolvedValue(user);
    findRoleByIdUseCase.execute.mockResolvedValue({
      canAccessBackoffice: false,
    } as never);

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).rejects.toMatchObject({
      message: 'O tipo do usuário é incompatível com o perfil selecionado',
    });

    expect(memberRepository.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar usuário comum com perfil global', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeMemberUser({ id: dto.userId });

    memberRepository.findByOrganizationAndUser.mockResolvedValue(null);
    findUserByIdUseCase.execute.mockResolvedValue(user);
    findRoleByIdUseCase.execute.mockResolvedValue({
      canAccessBackoffice: true,
    } as never);

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).rejects.toMatchObject({
      message: 'O tipo do usuário é incompatível com o perfil selecionado',
    });

    expect(memberRepository.create).not.toHaveBeenCalled();
  });
});
