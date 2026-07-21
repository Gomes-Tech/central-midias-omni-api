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
      name: 'Ana',
      socialReason: 'Razão Social',
      email: 'ana@test.com',
      taxIdentifier: '12345678900',
      phone: '11999999999',
      city: 'São Paulo',
      uf: 'SP' as const,
      birthDate: new Date('1990-01-01'),
      admissionDate: new Date('2020-01-01'),
      roleId: 'role-id',
      globalRoleId: null,
      isActive: true,
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
