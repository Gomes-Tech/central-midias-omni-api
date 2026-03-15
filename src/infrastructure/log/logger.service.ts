import { LogLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { LogRepository } from './log.repository';

export interface LogContext {
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Serviço de log que persiste em banco (tabela logs) para produção
 * e opcionalmente escreve no console em desenvolvimento.
 * Níveis: info, warning, error.
 */
@Injectable()
export class LoggerService {
  constructor(private readonly logRepository: LogRepository) {}

  async info(message: string, context?: LogContext): Promise<void> {
    await this.persist('INFO', message, context);
    if (process.env.NODE_ENV !== 'prod') {
      console.log(`[INFO] ${message}`, context ?? '');
    }
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    await this.persist('WARNING', message, context);
    if (process.env.NODE_ENV !== 'prod') {
      console.warn(`[WARN] ${message}`, context ?? '');
    }
  }

  async error(message: string, context?: LogContext): Promise<void> {
    await this.persist('ERROR', message, context);
    if (process.env.NODE_ENV !== 'prod') {
      console.error(`[ERROR] ${message}`, context ?? '');
    }
  }

  private async persist(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): Promise<void> {
    try {
      const { requestId, path, method, userId, ...extra } = context ?? {};
      await this.logRepository.create({
        level,
        message: message.slice(0, 2000),
        requestId: requestId as string | undefined,
        path: path as string | undefined,
        method: method as string | undefined,
        userId: userId as string | undefined,
        context:
          Object.keys(extra).length > 0
            ? (extra as Record<string, unknown>)
            : undefined,
      });
    } catch (err) {
      // Evita recursão: se falhar ao salvar log, apenas console
      if (process.env.NODE_ENV !== 'prod') {
        console.error('[LoggerService] Falha ao persistir log:', err);
      }
    }
  }
}
