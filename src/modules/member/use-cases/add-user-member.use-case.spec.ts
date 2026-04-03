import { BadRequestException } from '@common/filters';
import { FindRoleByIdUseCase } from '@modules/roles/use-cases/find-role-by-id.use-case';
import { FindUserByIdUseCase } from '@modules/user/use-cases/find-user-by-id.use-case';
import { makeUser } from '@modules/user/use-cases/test-helpers';
import { MemberRepository } from '../repository';
import { AddUserMemberUseCase } from './add-user-member.use-case';
import { makeCreateMemberDTO } from './test-helpers';

describe('AddUserMemberUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let findRoleByIdUseCase: jest.Mocked<FindRoleByIdUseCase>;
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

    useCase = new AddUserMemberUseCase(
      memberRepository,
      findUserByIdUseCase,
      findRoleByIdUseCase,
    );
  });

  it('deve criar vínculo quando usuário estiver ativo e sem duplicidade', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeUser({
      id: dto.userId,
      isActive: true,
      isDeleted: false,
    });

    memberRepository.findByOrganizationAndUser.mockResolvedValue(null);
    findUserByIdUseCase.execute.mockResolvedValue(user);
    findRoleByIdUseCase.execute.mockResolvedValue({} as never);
    memberRepository.create.mockResolvedValue(undefined);

    await expect(
      useCase.execute('org-id', dto, 'requester-id'),
    ).resolves.toBeUndefined();

    expect(memberRepository.findByOrganizationAndUser).toHaveBeenCalledWith(
      'org-id',
      dto.userId,
    );
    expect(findUserByIdUseCase.execute).toHaveBeenCalledWith(dto.userId);
    expect(findRoleByIdUseCase.execute).toHaveBeenCalledWith(dto.roleId);
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
    const user = makeUser({
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

  it('deve lançar erro quando usuário estiver removido (soft delete)', async () => {
    const dto = makeCreateMemberDTO();
    const user = makeUser({
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
});
