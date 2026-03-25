import { BadRequestException } from '@common/filters';
import { FindUserByIdUseCase, UpdateUserUseCase } from '@modules/user';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirstAccessUserUseCase {
  constructor(
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
  ) {}

  async execute(id: string, newPassword: string) {
    const user = await this.findUserByIdUseCase.execute(id);

    if (!user.isFirstAccess) {
      throw new BadRequestException('Usuário já possui acesso!');
    }

    await this.updateUserUseCase.execute(
      id,
      { isFirstAccess: false, password: newPassword },
      id,
    );
  }
}
