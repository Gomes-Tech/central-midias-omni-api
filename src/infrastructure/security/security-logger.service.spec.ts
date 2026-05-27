import { Logger } from '@nestjs/common';
import {
  SecurityLoggerService,
  __setSentryClientForTests,
} from './security-logger.service';

describe('SecurityLoggerService', () => {
  let service: SecurityLoggerService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  const originalSentryDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    service = new SecurityLoggerService();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    __setSentryClientForTests(null);
    delete process.env.SENTRY_DSN;
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    __setSentryClientForTests(null);
    if (originalSentryDsn === undefined) {
      delete process.env.SENTRY_DSN;
    } else {
      process.env.SENTRY_DSN = originalSentryDsn;
    }
  });

  it('logFailedLogin deve registrar warn com contexto', () => {
    service.logFailedLogin('a@b.com', '1.2.3.4', 'ua', 'bad');

    expect(warnSpy).toHaveBeenCalledWith(
      'Tentativa de login falhada',
      expect.objectContaining({
        email: 'a@b.com',
        ip: '1.2.3.4',
        userAgent: 'ua',
        metadata: { reason: 'bad' },
      }),
    );
  });

  it('logSuspiciousActivity deve registrar error', () => {
    service.logSuspiciousActivity('scan', { ip: '::1' });

    expect(errorSpy).toHaveBeenCalledWith(
      'Atividade suspeita detectada',
      expect.objectContaining({ activity: 'scan', ip: '::1' }),
    );
  });

  it('logSecurityEvent deve respeitar o nível', () => {
    service.logSecurityEvent('evt', 'info', { ip: '1' });
    service.logSecurityEvent('evt2', 'warn', { ip: '2' });
    service.logSecurityEvent('evt3', 'error', { ip: '3' });

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logUnauthorizedAccess e logInvalidToken devem usar warn', () => {
    service.logUnauthorizedAccess('/x', 'GET', 'ip');
    service.logInvalidToken('ip', '/y');

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('logPasswordResetAttempt deve logar sucesso ou falha', () => {
    service.logPasswordResetAttempt('e@e.com', 'ip', true);
    service.logPasswordResetAttempt('e@e.com', 'ip', false);

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('logSuccessfulLogin deve usar log', () => {
    service.logSuccessfulLogin('u1', 'e@e.com', 'ip');
    expect(logSpy).toHaveBeenCalledWith(
      'Login bem-sucedido',
      expect.objectContaining({ userId: 'u1' }),
    );
  });

  it('logForbiddenAccess e logBruteForceAttempt devem alertar', () => {
    service.logForbiddenAccess('u', '/p', 'POST', 'ip');
    service.logBruteForceAttempt('e@e.com', 'ip', 10);

    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logFailedLogin deve usar motivo padrão quando reason não for informado', () => {
    service.logFailedLogin('a@b.com', '1.2.3.4');

    expect(warnSpy).toHaveBeenCalledWith(
      'Tentativa de login falhada',
      expect.objectContaining({
        metadata: { reason: 'Credenciais inválidas' },
      }),
    );
  });

  it('logInvalidToken deve usar motivo padrão quando reason não for informado', () => {
    service.logInvalidToken('ip');

    expect(warnSpy).toHaveBeenCalledWith(
      'Tentativa de acesso com token inválido',
      expect.objectContaining({
        metadata: { reason: 'Token inválido ou expirado' },
      }),
    );
  });

  it('com Sentry configurado deve enviar eventos de segurança relevantes', () => {
    const captureMessage = jest.fn();
    __setSentryClientForTests({ captureMessage });
    process.env.SENTRY_DSN = 'https://example@sentry.io/1';

    service.logFailedLogin('a@b.com', 'ip');
    service.logSuspiciousActivity('scan', { ip: '::1' });
    service.logSecurityEvent('evt', 'warn', { ip: '1' });
    service.logSecurityEvent('evt2', 'error', { ip: '2' });
    service.logUnauthorizedAccess('/x', 'GET', 'ip');
    service.logInvalidToken('ip');
    service.logPasswordResetAttempt('e@e.com', 'ip', false);
    service.logForbiddenAccess('u', '/p', 'POST', 'ip');
    service.logBruteForceAttempt('e@e.com', 'ip', 5);

    expect(captureMessage).toHaveBeenCalled();
    expect(captureMessage.mock.calls.length).toBeGreaterThanOrEqual(8);
  });

  it('logSecurityEvent info não deve enviar ao Sentry', () => {
    const captureMessage = jest.fn();
    __setSentryClientForTests({ captureMessage });
    process.env.SENTRY_DSN = 'https://example@sentry.io/1';

    service.logSecurityEvent('evt', 'info', { ip: '1' });

    expect(captureMessage).not.toHaveBeenCalled();
  });
});
