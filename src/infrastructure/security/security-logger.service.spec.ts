import { Logger } from '@nestjs/common';
import { SecurityLoggerService } from './security-logger.service';

describe('SecurityLoggerService', () => {
  let service: SecurityLoggerService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new SecurityLoggerService();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
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
});
