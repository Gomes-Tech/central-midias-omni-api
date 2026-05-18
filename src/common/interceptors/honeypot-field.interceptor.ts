import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

const HONEYPOT_FIELD_NAME = 'userSource';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Campo honeypot usado apenas para capturar automações em rotas de criação/edição.
 * Não persista, documente como campo de negócio, nem repasse `userSource` aos use-cases.
 */
type HoneypotBody = Record<string, unknown> & {
  userSource?: string;
};

@Injectable()
export class HoneypotFieldInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    if (!this.hasHoneypotBody(request.body)) {
      return next.handle();
    }

    const body = request.body;
    const value = body[HONEYPOT_FIELD_NAME];

    if (!this.isEmptyHoneypotValue(value)) {
      throw new BadRequestException('Bad request');
    }

    if (HONEYPOT_FIELD_NAME in body) {
      // `userSource` vazio deve sumir antes dos DTOs/use-cases para não vazar para Prisma ou regras de negócio.
      delete body[HONEYPOT_FIELD_NAME];
    }

    return next.handle();
  }

  private hasHoneypotBody(body: unknown): body is HoneypotBody {
    return !!body && typeof body === 'object' && !Array.isArray(body);
  }

  private isEmptyHoneypotValue(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    return typeof value === 'string' && value.trim().length === 0;
  }
}
