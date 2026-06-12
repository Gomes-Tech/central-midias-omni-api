import { LoggerService } from '@infrastructure/log';
import { MailService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { MaterialAcceptanceEmailJobPayload } from '../queue/material-acceptance-email.job';

@Injectable()
export class SendMaterialAcceptanceEmailUseCase {
  constructor(
    private readonly mailService: MailService,
    private readonly logger: LoggerService,
  ) {}

  async execute(payload: MaterialAcceptanceEmailJobPayload): Promise<void> {
    if (process.env.NODE_ENV === 'prod') {
      await this.mailService.sendMail({
        to: payload.email,
        subject: `Confirmação de leitura: ${payload.materialName}`,
        template: 'material-acceptance',
        context: {
          name: payload.name,
          materialName: payload.materialName,
          materialLink: payload.materialLink,
        },
      });

      return;
    }

    void this.logger.info('Notificação de aceite de material enfileirada (dev)', {
      materialId: payload.materialId,
      organizationId: payload.organizationId,
      email: payload.email,
    });
  }
}
