import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';

export type RecordPlatformLoginTrigger = 'sign-in' | 'refresh';

@Injectable()
export class RecordUserPlatformLoginUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    userId: string,
    trigger: RecordPlatformLoginTrigger,
  ): Promise<void> {
    try {
      if (trigger === 'sign-in') {
        await this.userRepository.upsertPlatformLogin(userId);
        await this.userRepository.registerPlatformLoginEvent(userId);
        return;
      }

      const updated =
        await this.userRepository.updatePlatformLoginIfDifferentDay(userId);

      if (updated) {
        await this.userRepository.registerPlatformLoginEvent(userId);
      }
    } catch (error) {
      // Repository já trata erros internamente; esta camada evita propagação acidental.
    }
  }
}
