import { BadRequestException } from '@common/filters';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail({
    to,
    subject,
    template,
    context = {},
  }: {
    to: string;
    subject: string;
    template: string;
    context?: Record<string, any>;
  }): Promise<void> {
    await this.mailerService
      .sendMail({
        to,
        subject,
        template,
        context,
      })
      .catch((error) => {
        console.error('Error sending email:', error);
        throw new BadRequestException(
          'Ocorreu um erro ao enviar o email. Tente novamente!',
        );
      });
  }
}
