import { MemberRepository } from '../repository';
import { FindAllMembersUseCase } from './find-all-members.use-case';

describe('FindAllMembersUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let useCase: FindAllMembersUseCase;

  beforeEach(() => {
    memberRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<MemberRepository>;

    useCase = new FindAllMembersUseCase(memberRepository);
  });

  it('deve repassar organizationId e filtros para o repositório', async () => {
    const response = {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };

    memberRepository.findAll.mockResolvedValue(response);

    const result = await useCase.execute('org-id', {
      page: 2,
      limit: 10,
      roleId: 'role-id',
      searchTerm: 'ana',
    });

    expect(memberRepository.findAll).toHaveBeenCalledWith('org-id', {
      page: 2,
      limit: 10,
      roleId: 'role-id',
      searchTerm: 'ana',
    });
    expect(result).toEqual(response);
  });

  it('deve funcionar sem filtros opcionais', async () => {
    const response = {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };

    memberRepository.findAll.mockResolvedValue(response);

    const result = await useCase.execute('org-id');

    expect(memberRepository.findAll).toHaveBeenCalledWith('org-id', {});
    expect(result).toEqual(response);
  });
});
