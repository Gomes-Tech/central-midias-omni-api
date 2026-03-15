import { Injectable, Logger } from '@nestjs/common';

// Sentry é opcional - só será usado se estiver instalado e configurado
let Sentry: any = null;
try {
  Sentry = null;
} catch {
  // Sentry não está instalado, continuar sem ele
}

export interface SecurityLogContext {
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger(SecurityLoggerService.name);

  /**
   * Registra tentativa de login falhada
   */
  logFailedLogin(
    email: string,
    ip: string,
    userAgent?: string,
    reason?: string,
  ): void {
    const context: SecurityLogContext = {
      email,
      ip,
      userAgent,
      metadata: { reason: reason || 'Credenciais inválidas' },
    };

    this.logger.warn('Tentativa de login falhada', context);

    // Envia para Sentry como warning de segurança
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureMessage('Tentativa de login falhada', {
        level: 'warning',
        tags: {
          type: 'SECURITY',
          event: 'FAILED_LOGIN',
        },
        extra: context,
      });
    }
  }

  /**
   * Registra atividade suspeita detectada
   */
  logSuspiciousActivity(activity: string, context: SecurityLogContext): void {
    const logContext = {
      ...context,
      activity,
      timestamp: new Date().toISOString(),
    };

    this.logger.error('Atividade suspeita detectada', logContext);

    // Envia para Sentry como erro crítico de segurança
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureMessage(`Atividade suspeita: ${activity}`, {
        level: 'error',
        tags: {
          type: 'SECURITY_ALERT',
          event: 'SUSPICIOUS_ACTIVITY',
        },
        extra: logContext,
      });
    }
  }

  /**
   * Registra evento de segurança genérico
   */
  logSecurityEvent(
    event: string,
    level: 'info' | 'warn' | 'error',
    context: SecurityLogContext,
  ): void {
    const logContext = {
      ...context,
      event,
      timestamp: new Date().toISOString(),
    };

    switch (level) {
      case 'error':
        this.logger.error(`Evento de segurança: ${event}`, logContext);
        break;
      case 'warn':
        this.logger.warn(`Evento de segurança: ${event}`, logContext);
        break;
      default:
        this.logger.log(`Evento de segurança: ${event}`, logContext);
    }

    // Envia para Sentry apenas se for warn ou error
    if (
      Sentry &&
      process.env.SENTRY_DSN &&
      (level === 'warn' || level === 'error')
    ) {
      Sentry.captureMessage(`Evento de segurança: ${event}`, {
        level,
        tags: {
          type: 'SECURITY',
          event: event.toUpperCase().replace(/\s+/g, '_'),
        },
        extra: logContext,
      });
    }
  }

  /**
   * Registra tentativa de acesso não autorizado
   */
  logUnauthorizedAccess(
    endpoint: string,
    method: string,
    ip: string,
    userId?: string,
    userAgent?: string,
  ): void {
    const context: SecurityLogContext = {
      userId,
      ip,
      userAgent,
      endpoint,
      method,
    };

    this.logger.warn('Tentativa de acesso não autorizado', context);

    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureMessage('Tentativa de acesso não autorizado', {
        level: 'warning',
        tags: {
          type: 'SECURITY',
          event: 'UNAUTHORIZED_ACCESS',
        },
        extra: context,
      });
    }
  }

  /**
   * Registra tentativa de acesso com token inválido
   */
  logInvalidToken(
    ip: string,
    endpoint?: string,
    userAgent?: string,
    reason?: string,
  ): void {
    const context: SecurityLogContext = {
      ip,
      userAgent,
      endpoint,
      metadata: { reason: reason || 'Token inválido ou expirado' },
    };

    this.logger.warn('Tentativa de acesso com token inválido', context);

    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureMessage('Tentativa de acesso com token inválido', {
        level: 'warning',
        tags: {
          type: 'SECURITY',
          event: 'INVALID_TOKEN',
        },
        extra: context,
      });
    }
  }

  /**
   * Registra tentativa de reset de senha
   */
  logPasswordResetAttempt(
    email: string,
    ip: string,
    success: boolean,
    userAgent?: string,
  ): void {
    const context: SecurityLogContext = {
      email,
      ip,
      userAgent,
      metadata: { success },
    };

    if (success) {
      this.logger.log('Tentativa de reset de senha bem-sucedida', context);
    } else {
      this.logger.warn('Tentativa de reset de senha falhada', context);

      if (Sentry && process.env.SENTRY_DSN) {
        Sentry.captureMessage('Tentativa de reset de senha falhada', {
          level: 'warning',
          tags: {
            type: 'SECURITY',
            event: 'PASSWORD_RESET_FAILED',
          },
          extra: context,
        });
      }
    }
  }

  /**
   * Registra login bem-sucedido
   */
  logSuccessfulLogin(
    userId: string,
    email: string,
    ip: string,
    userAgent?: string,
  ): void {
    const context: SecurityLogContext = {
      userId,
      email,
      ip,
      userAgent,
    };

    this.logger.log('Login bem-sucedido', context);
  }

  /**
   * Registra tentativa de acesso a recurso protegido sem permissão
   */
  logForbiddenAccess(
    userId: string,
    endpoint: string,
    method: string,
    ip: string,
    requiredRole?: string,
    userAgent?: string,
  ): void {
    const context: SecurityLogContext = {
      userId,
      ip,
      userAgent,
      endpoint,
      method,
      metadata: { requiredRole },
    };

    this.logger.warn('Tentativa de acesso negado (sem permissão)', context);

    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureMessage('Tentativa de acesso negado', {
        level: 'warning',
        tags: {
          type: 'SECURITY',
          event: 'FORBIDDEN_ACCESS',
        },
        extra: context,
      });
    }
  }

  /**
   * Registra múltiplas tentativas de login falhadas (possível ataque de força bruta)
   */
  logBruteForceAttempt(
    email: string,
    ip: string,
    attemptCount: number,
    userAgent?: string,
  ): void {
    const context: SecurityLogContext = {
      email,
      ip,
      userAgent,
      metadata: { attemptCount },
    };

    this.logger.error(
      `Possível ataque de força bruta detectado: ${attemptCount} tentativas`,
      context,
    );

    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureMessage('Possível ataque de força bruta detectado', {
        level: 'error',
        tags: {
          type: 'SECURITY_ALERT',
          event: 'BRUTE_FORCE_ATTEMPT',
        },
        extra: context,
      });
    }
  }
}
