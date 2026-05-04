import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagRepository } from './repository';
import {
  CreateTagUseCase,
  DeleteTagUseCase,
  FindAllTagsUseCase,
  FindTagByIdUseCase,
  UpdateTagUseCase,
} from './use-cases';

@Module({
  controllers: [TagController],
  providers: [
    PlatformPermissionGuard,
    TagRepository,
    FindAllTagsUseCase,
    FindTagByIdUseCase,
    CreateTagUseCase,
    UpdateTagUseCase,
    DeleteTagUseCase,
    {
      provide: 'TagRepository',
      useExisting: TagRepository,
    },
  ],
  exports: [
    TagRepository,
    FindAllTagsUseCase,
    FindTagByIdUseCase,
    CreateTagUseCase,
    UpdateTagUseCase,
    DeleteTagUseCase,
    {
      provide: 'TagRepository',
      useExisting: TagRepository,
    },
  ],
})
export class TagModule {}
