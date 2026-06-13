import { BadRequestException } from '@common/filters';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail({
    to,
    subject,
    template,
    context = {},
    attachments,
  }: {
    to: string;
    subject: string;
    template: string;
    context?: Record<string, any>;
    attachments?: Attachment[];
  }): Promise<void> {
    await this.mailerService
      .sendMail({
        to,
        subject,
        template,
        context,
        attachments,
      })
      .catch((error) => {
        console.error('Error sending email:', error);
        throw new BadRequestException(
          'Ocorreu um erro ao enviar o email. Tente novamente!',
        );
      });
  }
}
