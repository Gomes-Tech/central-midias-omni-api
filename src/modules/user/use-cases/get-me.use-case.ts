import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(id: string) {
    const user = await this.userRepository.getMe(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    let avatarUrl: string | null = null;

    if (user.avatarKey) {
      avatarUrl = await this.storageService.getPublicUrl(user.avatarKey);
    }

    delete user.avatarKey;

    return {
      ...user,
      avatarUrl,
    };
  }
}
