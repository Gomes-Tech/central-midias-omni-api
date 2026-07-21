import { BadRequestException } from '@common/filters';
import { FindRoleByIdUseCase } from '@modules/roles/use-cases/find-role-by-id.use-case';
import { MemberRepository } from '../repository';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';
import { UpdateMemberUseCase } from './update-member.use-case';
import { makeUpdateMemberDTO } from './test-helpers';

describe('UpdateMemberUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let findMemberByIdUseCase: jest.Mocked<FindMemberByIdUseCase>;
  let findRoleByIdUseCase: jest.Mocked<FindRoleByIdUseCase>;
  let useCase: UpdateMemberUseCase;

  const roleIdA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const roleIdB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeEach(() => {
    memberRepository = {
      update: jest.fn(),
    } as unknown as jest.Mocked<MemberRepository>;

    findMemberByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindMemberByIdUseCase>;

    findRoleByIdUseCase = {
      execute: jest.fn().mockResolvedValue({
        canAccessBackoffice: false,
      } as never),
    } as unknown as jest.Mocked<FindRoleByIdUseCase>;

    useCase = new UpdateMemberUseCase(
      memberRepository,
      findMemberByIdUseCase,
      findRoleByIdUseCase,
    );
  });

  it('deve atualizar perfil quando for diferente do atual', async () => {
    const data = makeUpdateMemberDTO({ roleId: roleIdB });

    findMemberByIdUseCase.execute.mockResolvedValue({
      id: 'member-id',
      roleId: roleIdA,
      globalRoleId: null,
    } as never);

    memberRepository.update.mockResolvedValue(undefined);

    await expect(
      useCase.execute('member-id', 'org-id', data, 'editor-id'),
    ).resolves.toBeUndefined();

    expect(findMemberByIdUseCase.execute).toHaveBeenCalledWith(
      'member-id',
      'org-id',
    );
    expect(findRoleByIdUseCase.execute).toHaveBeenCalledWith(roleIdB, 'org-id');
    expect(memberRepository.update).toHaveBeenCalledWith(
      'member-id',
      'org-id',
      data,
      'editor-id',
    );
  });

  it('deve lançar erro quando o membro já estiver no perfil informado', async () => {
    const data = makeUpdateMemberDTO({ roleId: roleIdA });

    findMemberByIdUseCase.execute.mockResolvedValue({
      id: 'member-id',
      roleId: roleIdA,
      globalRoleId: null,
    } as never);

    await expect(
      useCase.execute('member-id', 'org-id', data, 'editor-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findRoleByIdUseCase.execute).not.toHaveBeenCalled();
    expect(memberRepository.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar perfil global para membro comum', async () => {
    const data = makeUpdateMemberDTO({ roleId: roleIdB });

    findMemberByIdUseCase.execute.mockResolvedValue({
      id: 'member-id',
      roleId: roleIdA,
      globalRoleId: null,
    } as never);
    findRoleByIdUseCase.execute.mockResolvedValue({
      canAccessBackoffice: true,
    } as never);

    await expect(
      useCase.execute('member-id', 'org-id', data, 'editor-id'),
    ).rejects.toMatchObject({
      message: 'O tipo do usuário é incompatível com o perfil selecionado',
    });

    expect(memberRepository.update).not.toHaveBeenCalled();
  });

  it('deve aceitar perfil global para usuário global', async () => {
    const data = makeUpdateMemberDTO({ roleId: roleIdB });

    findMemberByIdUseCase.execute.mockResolvedValue({
      id: 'member-id',
      roleId: roleIdA,
      globalRoleId: 'global-role-id',
    } as never);
    findRoleByIdUseCase.execute.mockResolvedValue({
      canAccessBackoffice: true,
    } as never);

    await expect(
      useCase.execute('member-id', 'org-id', data, 'editor-id'),
    ).resolves.toBeUndefined();

    expect(memberRepository.update).toHaveBeenCalledWith(
      'member-id',
      'org-id',
      data,
      'editor-id',
    );
  });

  it('deve atualizar sem validar role quando roleId não for informado', async () => {
    const data = makeUpdateMemberDTO({ roleId: undefined });

    findMemberByIdUseCase.execute.mockResolvedValue({
      id: 'member-id',
      roleId: roleIdA,
      globalRoleId: null,
    } as never);

    await expect(
      useCase.execute('member-id', 'org-id', data, 'editor-id'),
    ).resolves.toBeUndefined();

    expect(findRoleByIdUseCase.execute).not.toHaveBeenCalled();
    expect(memberRepository.update).toHaveBeenCalledWith(
      'member-id',
      'org-id',
      data,
      'editor-id',
    );
  });
});
