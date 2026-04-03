import { CreateMemberDTO, UpdateMemberDTO } from '../dto';

export function makeCreateMemberDTO(
  overrides: Partial<CreateMemberDTO> = {},
): CreateMemberDTO {
  return {
    userId: '11111111-1111-4111-8111-111111111111',
    roleId: '22222222-2222-4222-8222-222222222222',
    ...overrides,
  };
}

export function makeUpdateMemberDTO(
  overrides: Partial<UpdateMemberDTO> = {},
): UpdateMemberDTO {
  return {
    roleId: '33333333-3333-4333-8333-333333333333',
    ...overrides,
  };
}
