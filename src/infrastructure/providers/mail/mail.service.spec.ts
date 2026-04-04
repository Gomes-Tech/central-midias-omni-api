import { BadRequestException } from '@common/filters';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

describe('MailService', () => {
  let mailer: jest.Mocked<Pick<MailerService, 'sendMail'>>;
  let service: MailService;

  beforeEach(() => {
    mailer = { sendMail: jest.fn().mockResolvedValue(undefined) };
    service = new MailService(mailer as unknown as MailerService);
  });

  it('sendMail deve delegar ao MailerService', async () => {
    await service.sendMail({
      to: 'a@b.com',
      subject: 's',
      template: 'welcome',
      context: { name: 'x' },
    });

    expect(mailer.sendMail).toHaveBeenCalledWith({
      to: 'a@b.com',
      subject: 's',
      template: 'welcome',
      context: { name: 'x' },
    });
  });

  it('sendMail deve lançar BadRequestException quando o envio falhar', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mailer.sendMail.mockRejectedValue(new Error('smtp'));

    await expect(
      service.sendMail({ to: 'x', subject: 's', template: 't' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    consoleSpy.mockRestore();
  });
});
