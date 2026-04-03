import { NotFoundException } from '@common/filters';
import { MemberRepository } from '../repository';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

describe('FindMemberByIdUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let useCase: FindMemberByIdUseCase;

  beforeEach(() => {
    memberRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<MemberRepository>;

    useCase = new FindMemberByIdUseCase(memberRepository);
  });

  it('deve retornar o membro quando existir', async () => {
    const member = {
      id: 'member-id',
      user: { name: 'Ana', email: 'ana@test.com', isActive: true },
      role: { label: 'Editor' },
    };

    memberRepository.findById.mockResolvedValue(member);

    await expect(
      useCase.execute('member-id', 'org-id'),
    ).resolves.toEqual(member);
    expect(memberRepository.findById).toHaveBeenCalledWith(
      'member-id',
      'org-id',
    );
  });

  it('deve lançar NotFoundException quando não existir', async () => {
    memberRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'org-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
