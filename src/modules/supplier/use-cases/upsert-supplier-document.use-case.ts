import { getUploadFileExtension } from '@common/constants/allowed-upload-files';
import { BadRequestException, ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { SupplierRepository } from '../repository';

@Injectable()
export class UpsertSupplierDocumentUseCase {
  constructor(
    @Inject('SupplierRepository')
    private readonly supplierRepository: SupplierRepository,
    private readonly findMemberRoleUseCase: FindMemberRoleUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    file?: Express.Multer.File,
  ): Promise<void> {
    const memberRole = await this.findMemberRoleUseCase.execute(
      organizationId,
      userId,
    );

    if (!memberRole.canAccessBackoffice) {
      throw new ForbiddenException(
        'Apenas usuários com acesso ao backoffice podem atualizar o documento de fornecedores',
      );
    }

    if (!file) {
      throw new BadRequestException('O arquivo PDF é obrigatório');
    }

    if (!this.isPdfFile(file)) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. É aceito apenas PDF.',
      );
    }

    const previousKey =
      await this.supplierRepository.findDocumentKey(organizationId);

    const upload = await this.storageService.uploadFile(file, 'suppliers');

    await this.supplierRepository.upsertDocument(
      organizationId,
      upload.path,
      userId,
    );

    if (previousKey && previousKey !== upload.path) {
      await this.storageService.deleteFile([previousKey]);
    }
  }

  private isPdfFile(file: Express.Multer.File): boolean {
    const extension = getUploadFileExtension(file.originalname);
    if (extension !== 'pdf') {
      return false;
    }

    const mime = (file.mimetype || '').toLowerCase().trim();
    if (!mime || mime === 'application/octet-stream') {
      return true;
    }

    return mime === 'application/pdf';
  }
}
