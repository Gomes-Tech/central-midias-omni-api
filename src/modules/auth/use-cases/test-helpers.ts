import { LoginDTO } from '../dto';

export function makeLoginDTO(overrides: Partial<LoginDTO> = {}): LoginDTO {
  return {
    email: 'john@doe.com',
    password: 'secret123',
    ...overrides,
  };
}
