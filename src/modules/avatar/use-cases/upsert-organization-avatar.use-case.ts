import { getUploadFileExtension } from '@common/constants/allowed-upload-files';
import { BadRequestException, ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { OrganizationAvatarType } from '../entities';
import { AvatarRepository } from '../repository';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg']);

@Injectable()
export class UpsertOrganizationAvatarUseCase {
  constructor(
    @Inject('AvatarRepository')
    private readonly avatarRepository: AvatarRepository,
    private readonly findMemberRoleUseCase: FindMemberRoleUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    type: OrganizationAvatarType,
    file?: Express.Multer.File,
  ): Promise<void> {
    const memberRole = await this.findMemberRoleUseCase.execute(
      organizationId,
      userId,
    );

    if (!memberRole.canAccessBackoffice) {
      throw new ForbiddenException(
        'Apenas usuários com acesso ao backoffice podem atualizar os avatares',
      );
    }

    if (!file) {
      throw new BadRequestException('O arquivo de imagem é obrigatório');
    }

    if (!this.isImageFile(file)) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. São aceitos apenas PNG e JPEG.',
      );
    }

    const previousKey = await this.avatarRepository.findAvatarKey(
      organizationId,
      type,
    );

    const upload = await this.storageService.uploadFile(file, 'avatars');

    await this.avatarRepository.updateAvatarKey(
      organizationId,
      type,
      upload.path,
      userId,
    );

    if (previousKey && previousKey !== upload.path) {
      await this.storageService.deleteFile([previousKey]);
    }
  }

  private isImageFile(file: Express.Multer.File): boolean {
    const extension = getUploadFileExtension(file.originalname);
    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      return false;
    }

    const mime = (file.mimetype || '').toLowerCase().trim();
    if (!mime || mime === 'application/octet-stream') {
      return true;
    }

    return mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg';
  }
}
