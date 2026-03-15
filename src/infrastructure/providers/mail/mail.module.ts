import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { Global, Module } from '@nestjs/common';
import { join } from 'path';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          secure: true,
        },
        defaults: {
          from: `"Prefeitura de Belford Roxo" <${process.env.SMTP_FROM}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new PugAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
