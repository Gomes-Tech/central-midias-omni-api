import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { FindGlobalRoleByIdUseCase } from '@modules/roles';
import { Inject, Injectable } from '@nestjs/common';
import { UserUpdateInput } from '../dto';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly cryptographyService: CryptographyService,
    private readonly findGlobalRoleByIdUseCase: FindGlobalRoleByIdUseCase,
  ) {}

  async execute(
    id: string,
    data: UserUpdateInput,
    userId: string,
    organizationId?: string,
  ) {
    const payload = await this.sanitizeUpdatePayload(
      data,
      userId,
      organizationId,
    );
    const user = await this.findUserByIdUseCase.execute(id, organizationId);

    if (payload.email && payload.email !== user.email) {
      const userWithEmail = await this.findUserByEmailUseCase
        .execute(payload.email)
        .catch(() => null);

      if (userWithEmail && userWithEmail.id !== id) {
        throw new BadRequestException('Já existe um usuário com este email');
      }
    }

    if (
      payload.taxIdentifier !== undefined &&
      payload.taxIdentifier !== user.taxIdentifier
    ) {
      const userWithTax = await this.userRepository.findByTaxIdentifier(
        payload.taxIdentifier,
      );

      if (userWithTax && userWithTax.id !== id) {
        throw new BadRequestException(
          'Já existe um usuário com este documento',
        );
      }
    }

    if (payload.password) {
      const isOldPassword = await this.cryptographyService.compare(
        payload.password,
        user.password,
      );

      if (isOldPassword) {
        throw new BadRequestException(
          'A senha nova não pode ser igual à uma senha anterior!',
        );
      }

      payload.password = await this.cryptographyService.hash(payload.password);
    }

    if (payload.globalRoleId) {
      await this.findGlobalRoleByIdUseCase.execute(payload.globalRoleId);
    }

    if (organizationId && payload.managerAssignments !== undefined) {
      await this.userRepository.assertValidManagerAssignments(
        organizationId,
        payload.managerAssignments,
        id,
      );
    }

    await this.userRepository.update(id, payload, userId, organizationId);
  }

  private async sanitizeUpdatePayload(
    data: UserUpdateInput,
    actorId: string,
    organizationId?: string,
  ): Promise<UserUpdateInput> {
    if (!organizationId) {
      return { ...data };
    }

    const payload: UserUpdateInput = { ...data };
    delete payload.password;
    delete payload.isFirstAccess;

    if (payload.globalRoleId) {
      const actorIsPlatformAdmin =
        await this.userRepository.hasPlatformAdminRole(actorId);

      if (!actorIsPlatformAdmin) {
        delete payload.globalRoleId;
      }
    }

    return payload;
  }
}
