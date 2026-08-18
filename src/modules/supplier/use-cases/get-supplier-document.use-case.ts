import {
  S3_MAX_SIGNED_URL_EXPIRES_IN,
  StorageService,
} from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { SupplierDocument } from '../entities';
import { SupplierRepository } from '../repository';

@Injectable()
export class GetSupplierDocumentUseCase {
  constructor(
    @Inject('SupplierRepository')
    private readonly supplierRepository: SupplierRepository,
    private readonly findMemberRoleUseCase: FindMemberRoleUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
  ): Promise<SupplierDocument> {
    await this.findMemberRoleUseCase.execute(organizationId, userId);

    const fileKey =
      await this.supplierRepository.findDocumentKey(organizationId);

    if (!fileKey) {
      return { url: null };
    }

    const url = await this.storageService
      .getPublicUrl(fileKey, S3_MAX_SIGNED_URL_EXPIRES_IN)
      .catch(() => null);

    return { url };
  }
}
