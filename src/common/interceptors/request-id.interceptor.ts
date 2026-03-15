import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Constante para o nome do header de request ID
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Constante para a chave do request ID no objeto Request
 */
export const REQUEST_ID_KEY = 'requestId';

/**
 * Interceptor que gera ou utiliza um Request ID para rastreamento de requisições
 *
 * Funcionalidades:
 * - Gera um UUID único se não houver X-Request-ID no header
 * - Reutiliza o X-Request-ID se fornecido pelo cliente
 * - Adiciona o Request ID ao header de resposta
 * - Disponibiliza o Request ID no objeto Request para uso em logs e serviços
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Obtém o Request ID do header ou gera um novo
    const requestId =
      request.headers[REQUEST_ID_HEADER]?.toString() || randomUUID();

    // Adiciona o Request ID ao objeto Request para uso em toda a aplicação
    (request as any)[REQUEST_ID_KEY] = requestId;

    // Adiciona o Request ID ao header de resposta
    response.setHeader(REQUEST_ID_HEADER, requestId);

    // Continua com a requisição e adiciona o Request ID aos logs
    return next.handle().pipe(
      tap({
        next: () => {
          // Request ID já está disponível no request e response
        },
        error: () => {
          // Em caso de erro, o Request ID já está disponível para logs
        },
      }),
    );
  }
}
