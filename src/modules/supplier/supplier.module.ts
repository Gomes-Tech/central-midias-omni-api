import { PlatformPermissionGuard } from '@common/guards';
import { MemberModule } from '@modules/member';
import { Module } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierRepository } from './repository';
import {
  GetSupplierDocumentUseCase,
  UpsertSupplierDocumentUseCase,
} from './use-cases';

@Module({
  imports: [MemberModule],
  controllers: [SupplierController],
  providers: [
    PlatformPermissionGuard,
    SupplierRepository,
    GetSupplierDocumentUseCase,
    UpsertSupplierDocumentUseCase,
    {
      provide: 'SupplierRepository',
      useExisting: SupplierRepository,
    },
  ],
  exports: [
    SupplierRepository,
    GetSupplierDocumentUseCase,
    UpsertSupplierDocumentUseCase,
    {
      provide: 'SupplierRepository',
      useExisting: SupplierRepository,
    },
  ],
})
export class SupplierModule {}
