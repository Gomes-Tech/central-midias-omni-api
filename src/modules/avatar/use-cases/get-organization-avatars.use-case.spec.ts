import { StorageService } from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { AvatarRepository } from '../repository';
import { GetOrganizationAvatarsUseCase } from './get-organization-avatars.use-case';

describe('GetOrganizationAvatarsUseCase', () => {
  let avatarRepository: jest.Mocked<Pick<AvatarRepository, 'findAvatarKeys'>>;
  let findMemberRoleUseCase: jest.Mocked<
    Pick<FindMemberRoleUseCase, 'execute'>
  >;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: GetOrganizationAvatarsUseCase;

  beforeEach(() => {
    avatarRepository = {
      findAvatarKeys: jest.fn().mockResolvedValue({
        standardAvatarKey: null,
        customizableAvatarKey: null,
      }),
    };
    findMemberRoleUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    storageService = {
      getPublicUrl: jest.fn().mockResolvedValue('https://cdn.test/signed-url'),
    };

    useCase = new GetOrganizationAvatarsUseCase(
      avatarRepository as unknown as AvatarRepository,
      findMemberRoleUseCase as unknown as FindMemberRoleUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar urls nulas quando não houver avatares', async () => {
    await expect(useCase.execute('org-1', 'user-1')).resolves.toEqual({
      standardAvatarUrl: null,
      customizableAvatarUrl: null,
    });
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar urls assinadas quando houver avatares', async () => {
    avatarRepository.findAvatarKeys.mockResolvedValue({
      standardAvatarKey: 'avatars/padrao.png',
      customizableAvatarKey: 'avatars/custom.png',
    });

    await expect(useCase.execute('org-1', 'user-1')).resolves.toEqual({
      standardAvatarUrl: 'https://cdn.test/signed-url',
      customizableAvatarUrl: 'https://cdn.test/signed-url',
    });

    expect(storageService.getPublicUrl).toHaveBeenCalledTimes(2);
  });
});
