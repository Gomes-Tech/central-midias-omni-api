import { MailService } from '@infrastructure/providers';
import { CreateUserUseCase } from '@modules/user';
import { Injectable } from '@nestjs/common';
import { CreateMemberWithUserDTO } from '../dto';

@Injectable()
export class CreateMemberWithUserUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly mailService: MailService,
  ) {}

  async execute(
    organizationId: string,
    data: CreateMemberWithUserDTO,
    userId: string,
  ) {
    await this.createUserUseCase.execute(
      {
        ...data,
      },
      userId,
      organizationId,
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
  }
}
