import { BadRequestException } from '@common/filters';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Attachment } from 'nodemailer/lib/mailer';
import { join } from 'path';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  private readonly brandAttachments: Attachment[] = [
    {
      filename: 'footer-logos.png',
      path: join(__dirname, 'assets', 'footer-logos.png'),
      cid: 'footer-logos',
    },
  ];

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
        attachments: [...this.brandAttachments, ...(attachments ?? [])],
      })
      .catch((error) => {
        console.error('Error sending email:', error);
        throw new BadRequestException(
          'Ocorreu um erro ao enviar o email. Tente novamente!',
        );
      });
  }
}
