import { makeCreateMemberDTO, makeUpdateMemberDTO } from './test-helpers';

describe('member use-cases test-helpers', () => {
  it('makeUpdateMemberDTO sem argumentos usa defaults', () => {
    const dto = makeUpdateMemberDTO();
    expect(dto.roleId).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('makeCreateMemberDTO aplica overrides', () => {
    expect(
      makeCreateMemberDTO({ userId: '00000000-0000-4000-8000-000000000001' })
        .userId,
    ).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('makeUpdateMemberDTO aplica overrides', () => {
    expect(
      makeUpdateMemberDTO({
        roleId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }).roleId,
    ).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });
});
