import { MemberRepository } from '../repository';
import { DeleteMemberUseCase } from './delete-member.use-case';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

describe('DeleteMemberUseCase', () => {
  let memberRepository: jest.Mocked<MemberRepository>;
  let findMemberByIdUseCase: jest.Mocked<FindMemberByIdUseCase>;
  let useCase: DeleteMemberUseCase;

  beforeEach(() => {
    memberRepository = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<MemberRepository>;

    findMemberByIdUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'member-id' }),
    } as unknown as jest.Mocked<FindMemberByIdUseCase>;

    useCase = new DeleteMemberUseCase(memberRepository, findMemberByIdUseCase);
  });

  it('deve validar o membro antes de excluir', async () => {
    memberRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('member-id', 'org-id')).resolves.toBeUndefined();

    expect(findMemberByIdUseCase.execute).toHaveBeenCalledWith(
      'member-id',
      'org-id',
    );
    expect(memberRepository.delete).toHaveBeenCalledWith('member-id', 'org-id');
  });
});
