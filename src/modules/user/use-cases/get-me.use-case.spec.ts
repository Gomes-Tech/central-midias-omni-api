import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { UserRepository } from '../repository';
import { GetMeUseCase } from './get-me.use-case';

describe('GetMeUseCase', () => {
  let userRepository: jest.Mocked<Pick<UserRepository, 'getMe'>>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: GetMeUseCase;

  beforeEach(() => {
    userRepository = { getMe: jest.fn() };
    storageService = { getPublicUrl: jest.fn() };

    useCase = new GetMeUseCase(
      userRepository as unknown as UserRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar usuário sem avatarKey e avatarUrl null quando não houver chave', async () => {
    const userFromRepo = {
      name: 'Ana',
      email: 'ana@test.com',
      taxIdentifier: '1',
      phone: null,
      socialReason: null,
      avatarKey: null,
      isFirstAccess: false,
      isActive: true,
      canAccessBackoffice: false,
    };
    userRepository.getMe.mockResolvedValue(userFromRepo);

    await expect(useCase.execute('user-1')).resolves.toEqual({
      name: 'Ana',
      email: 'ana@test.com',
      taxIdentifier: '1',
      phone: null,
      socialReason: null,
      isFirstAccess: false,
      isActive: true,
      canAccessBackoffice: false,
      avatarUrl: null,
    });
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve definir avatarUrl via storage e remover avatarKey quando houver chave', async () => {
    userRepository.getMe.mockResolvedValue({
      name: 'Beto',
      email: 'beto@test.com',
      taxIdentifier: '2',
      phone: null,
      socialReason: null,
      avatarKey: 'avatars/beto.png',
      isFirstAccess: true,
      isActive: true,
      canAccessBackoffice: true,
    });
    storageService.getPublicUrl.mockResolvedValue('https://cdn.example/beto.png');

    await expect(useCase.execute('user-2')).resolves.toEqual({
      name: 'Beto',
      email: 'beto@test.com',
      taxIdentifier: '2',
      phone: null,
      socialReason: null,
      isFirstAccess: true,
      isActive: true,
      canAccessBackoffice: true,
      avatarUrl: 'https://cdn.example/beto.png',
    });

    expect(storageService.getPublicUrl).toHaveBeenCalledWith('avatars/beto.png');
  });

  it('deve lançar NotFound quando o repositório não encontrar usuário', async () => {
    userRepository.getMe.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });
});
