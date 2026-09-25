import { BadRequestException, ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { AvatarRepository } from '../repository';
import { UpsertOrganizationAvatarUseCase } from './upsert-organization-avatar.use-case';

function makeMemberRole(canAccessBackoffice = true) {
  return {
    roleId: 'role-1',
    name: 'ADMIN',
    label: 'Administrador',
    canAccessBackoffice,
    permissions: [],
    categoryRoleAccesses: [],
  };
}

function makeImageFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    originalname: 'avatar.png',
    mimetype: 'image/png',
    ...overrides,
  } as Express.Multer.File;
}

describe('UpsertOrganizationAvatarUseCase', () => {
  let avatarRepository: jest.Mocked<
    Pick<AvatarRepository, 'findAvatarKey' | 'updateAvatarKey'>
  >;
  let findMemberRoleUseCase: jest.Mocked<
    Pick<FindMemberRoleUseCase, 'execute'>
  >;
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile'>
  >;
  let useCase: UpsertOrganizationAvatarUseCase;

  beforeEach(() => {
    avatarRepository = {
      findAvatarKey: jest.fn().mockResolvedValue(null),
      updateAvatarKey: jest.fn().mockResolvedValue(undefined),
    };
    findMemberRoleUseCase = {
      execute: jest.fn().mockResolvedValue(makeMemberRole()),
    };
    storageService = {
      uploadFile: jest.fn().mockResolvedValue({ path: 'avatars/avatar.png' }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new UpsertOrganizationAvatarUseCase(
      avatarRepository as unknown as AvatarRepository,
      findMemberRoleUseCase as unknown as FindMemberRoleUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve lançar Forbidden quando o usuário não tiver canAccessBackoffice', async () => {
    findMemberRoleUseCase.execute.mockResolvedValue(makeMemberRole(false));

    await expect(
      useCase.execute('org-1', 'user-1', 'standard', makeImageFile()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o arquivo não for enviado', async () => {
    await expect(
      useCase.execute('org-1', 'user-1', 'standard'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o arquivo não for PNG ou JPEG', async () => {
    await expect(
      useCase.execute(
        'org-1',
        'user-1',
        'standard',
        makeImageFile({
          originalname: 'avatar.pdf',
          mimetype: 'application/pdf',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve fazer upload e salvar a key quando a organização não possuir avatar', async () => {
    const file = makeImageFile();

    await expect(
      useCase.execute('org-1', 'user-1', 'standard', file),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledWith(file, 'avatars');
    expect(avatarRepository.updateAvatarKey).toHaveBeenCalledWith(
      'org-1',
      'standard',
      'avatars/avatar.png',
      'user-1',
    );
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('deve aceitar JPEG com mime octet-stream', async () => {
    const file = makeImageFile({
      originalname: 'avatar.jpg',
      mimetype: 'application/octet-stream',
    });

    await expect(
      useCase.execute('org-1', 'user-1', 'customizable', file),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledWith(file, 'avatars');
    expect(avatarRepository.updateAvatarKey).toHaveBeenCalledWith(
      'org-1',
      'customizable',
      'avatars/avatar.png',
      'user-1',
    );
  });

  it('deve substituir o avatar anterior e remover o arquivo antigo', async () => {
    avatarRepository.findAvatarKey.mockResolvedValue('avatars/antigo.png');

    await expect(
      useCase.execute('org-1', 'user-1', 'standard', makeImageFile()),
    ).resolves.toBeUndefined();

    expect(avatarRepository.updateAvatarKey).toHaveBeenCalledWith(
      'org-1',
      'standard',
      'avatars/avatar.png',
      'user-1',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'avatars/antigo.png',
    ]);
  });
});
