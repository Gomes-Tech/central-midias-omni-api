import { NotFoundException } from '@common/filters';
import { MemberRepository } from '../repository';
import { FindMemberRoleDetailsUseCase } from './find-member-role-details.use-case';

describe('FindMemberRoleDetailsUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let useCase: FindMemberRoleDetailsUseCase;

  beforeEach(() => {
    memberRepository = {
      findMemberRoleDetails: jest.fn(),
    } as unknown as jest.Mocked<MemberRepository>;

    useCase = new FindMemberRoleDetailsUseCase(memberRepository);
  });

  it('deve retornar o papel detalhado quando o membro existir', async () => {
    const role = {
      label: 'Administrador',
      canAccessBackoffice: true,
      permissions: [
        {
          module: { id: 'm1', name: 'members', label: 'Membros' },
          actions: ['READ'],
        },
      ],
      categoryRoleAccesses: [
        {
          id: 'cra-1',
          categoryId: 'cat-1',
          organizationId: 'org-1',
          category: { id: 'cat-1', name: 'Categoria', slug: 'categoria' },
        },
      ],
    };

    memberRepository.findMemberRoleDetails.mockResolvedValue(role as any);

    await expect(useCase.execute('org-1', 'user-1')).resolves.toEqual(role);
    expect(memberRepository.findMemberRoleDetails).toHaveBeenCalledWith(
      'org-1',
      'user-1',
    );
  });

  it('deve lançar NotFoundException quando não existir', async () => {
    memberRepository.findMemberRoleDetails.mockResolvedValue(null);

    await expect(useCase.execute('org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

