import { NotFoundException } from '@common/filters';
import { MemberRepository } from '../repository';
import { FindMemberRoleUseCase } from './find-member-role.use-case';

describe('FindMemberRoleUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let useCase: FindMemberRoleUseCase;

  beforeEach(() => {
    memberRepository = {
      findMemberRole: jest.fn(),
    } as unknown as jest.Mocked<MemberRepository>;

    useCase = new FindMemberRoleUseCase(memberRepository);
  });

  it('deve retornar o papel quando o membro existir', async () => {
    const role = {
      name: 'admin',
      label: 'Administrador',
      canAccessBackoffice: true,
    };

    memberRepository.findMemberRole.mockResolvedValue(role);

    await expect(
      useCase.execute('org-id', 'user-id'),
    ).resolves.toEqual(role);
    expect(memberRepository.findMemberRole).toHaveBeenCalledWith(
      'org-id',
      'user-id',
    );
  });

  it('deve lançar NotFoundException quando não existir', async () => {
    memberRepository.findMemberRole.mockResolvedValue(null);

    await expect(
      useCase.execute('org-id', 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
