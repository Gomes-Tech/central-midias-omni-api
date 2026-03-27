import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { MailService } from '@infrastructure/providers';
import { FindRoleByIdUseCase } from '@modules/roles/use-cases/find-role-by-id.use-case';
import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../../user/repository';
import { CreateMemberWithUserDTO } from '../dto';
import { MemberRepository } from '../repository';

@Injectable()
export class CreateMemberWithUserUseCase {
  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly cryptographyService: CryptographyService,
    private readonly mailService: MailService,
  ) {}

  async execute(
    organizationId: string,
    data: CreateMemberWithUserDTO,
    userId: string,
  ) {
    const existingUserByEmail = await this.userRepository.findByEmail(
      data.email,
    );
    if (existingUserByEmail) {
      throw new BadRequestException('Usuário já existe! Tente outro email.');
    }

    const existingTax = await this.userRepository.findByTaxIdentifier(
      data.taxIdentifier,
    );
    if (existingTax) {
      throw new BadRequestException(
        'Já existe um usuário com este documento. Tente outro.',
      );
    }

    await this.findRoleByIdUseCase.execute(data.roleId);

    const hashedPassword = await this.cryptographyService.hash(
      data.taxIdentifier,
    );

    const member = await this.memberRepository.createWithNewUser(
      organizationId,
      {
        ...data,
        password: hashedPassword,
      },
      userId,
    );

    if (process.env.NODE_ENV === 'prod') {
      await this.mailService.sendMail({
        to: data.email,
        subject: 'Bem-vindo ao sistema',
        template: 'welcome',
        context: {
          name: data.name,
          email: data.email,
          taxIdentifier: data.taxIdentifier,
        },
      });
    }

    return member;
  }
}
