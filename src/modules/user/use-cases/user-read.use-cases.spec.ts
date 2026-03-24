import { NotFoundException as NestNotFoundException } from '@nestjs/common';
import { NotFoundException } from '@common/filters';
import { UserRepository } from '../repository';
import { DeleteUserUseCase } from './delete-user.use-case';
import { FindAllUsersUseCase } from './find-all-users.use-case';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { FindUserRoleUseCase } from './find-user-role.use-case';
import { makeUser, makeUserRole } from './test-helpers';

describe('User read and delete use cases', () => {
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepository = {
      findAll: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findRoleByUserId: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
  });

  it('FindAllUsersUseCase deve repassar os filtros para o repositório', async () => {
    const useCase = new FindAllUsersUseCase(userRepository);
    const response = {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };

    userRepository.findAll.mockResolvedValue(response);

    const result = await useCase.execute({ page: 1, limit: 10, name: 'John' });

    expect(userRepository.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      name: 'John',
    });
    expect(result).toEqual(response);
  });

  it('FindUserByEmailUseCase deve retornar usuário por email', async () => {
    const useCase = new FindUserByEmailUseCase(userRepository);
    const user = makeUser();

    userRepository.findByEmail.mockResolvedValue(user);

    await expect(useCase.execute(user.email)).resolves.toEqual(user);
  });

  it('FindUserByEmailUseCase deve lançar not found quando usuário não existir', async () => {
    const useCase = new FindUserByEmailUseCase(userRepository);

    userRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute('missing@user.com')).rejects.toBeInstanceOf(
      NestNotFoundException,
    );
  });

  it('FindUserByIdUseCase deve retornar usuário por id', async () => {
    const useCase = new FindUserByIdUseCase(userRepository);
    const user = makeUser();

    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(user.id)).resolves.toEqual(user);
  });

  it('FindUserByIdUseCase deve lançar not found quando usuário não existir', async () => {
    const useCase = new FindUserByIdUseCase(userRepository);

    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('FindUserRoleUseCase deve retornar a role principal do usuário', async () => {
    const useCase = new FindUserRoleUseCase(userRepository);

    userRepository.findRoleByUserId.mockResolvedValue(makeUserRole('ADMIN'));

    await expect(useCase.execute('user-id')).resolves.toBe('ADMIN');
  });

  it('FindUserRoleUseCase deve lançar not found quando usuário não existir', async () => {
    const useCase = new FindUserRoleUseCase(userRepository);

    userRepository.findRoleByUserId.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('DeleteUserUseCase deve validar o usuário antes de excluir', async () => {
    const findUserByIdUseCase = {
      execute: jest.fn().mockResolvedValue(makeUser()),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;
    const useCase = new DeleteUserUseCase(userRepository, findUserByIdUseCase);

    userRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('user-id')).resolves.toBeUndefined();
    expect(findUserByIdUseCase.execute).toHaveBeenCalledWith('user-id');
    expect(userRepository.delete).toHaveBeenCalledWith('user-id');
  });
});
