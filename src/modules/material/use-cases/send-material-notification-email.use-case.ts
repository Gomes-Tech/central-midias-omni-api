import { LoggerService } from '@infrastructure/log';
import { MailService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { MaterialNotificationEmailJobPayload } from '../queue/material-notification-email.job';
import { buildMaterialNotificationEmailSubject } from '../utils/material-notification-email-content';

@Injectable()
export class SendMaterialNotificationEmailUseCase {
  constructor(
    private readonly mailService: MailService,
    private readonly logger: LoggerService,
  ) {}

  async execute(payload: MaterialNotificationEmailJobPayload): Promise<void> {
    if (process.env.NODE_ENV === 'prod') {
      await this.mailService.sendMail({
        to: payload.email,
        subject: buildMaterialNotificationEmailSubject(payload.materialName),
        template: 'material-notification',
        context: {
          name: payload.name,
          materialName: payload.materialName,
          materialLink: payload.materialLink,
        },
      });

      return;
    }

    void this.logger.info('Notificação de material enfileirada (dev)', {
      materialId: payload.materialId,
      organizationId: payload.organizationId,
      email: payload.email,
    });
  }
}
