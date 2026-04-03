import { NotFoundException as NestNotFoundException } from '@nestjs/common';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { makeUser } from './test-helpers';

describe('FindUserByEmailUseCase', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let useCase: FindUserByEmailUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    useCase = new FindUserByEmailUseCase(userRepository);
  });

  it('deve retornar usuário por email', async () => {
    const user = makeUser();

    userRepository.findByEmail.mockResolvedValue(user);

    await expect(useCase.execute(user.email)).resolves.toEqual(user);
  });

  it('deve lançar not found quando usuário não existir', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute('missing@user.com')).rejects.toBeInstanceOf(
      NestNotFoundException,
    );
  });
});
