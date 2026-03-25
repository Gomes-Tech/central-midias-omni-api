import { Inject, Injectable } from '@nestjs/common';
import { TokenPasswordRepository } from '../repository';

@Injectable()
export class UpdateTokenPasswordUseCase {
  constructor(
    @Inject('TokenPasswordRepository')
    private readonly tokenPasswordRepository: TokenPasswordRepository,
  ) {}

  async execute(email: string) {
    await this.tokenPasswordRepository.updateToken(email);
  }
}
