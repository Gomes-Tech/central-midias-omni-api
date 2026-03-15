import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const method = request.method;
    const route = this.getRoute(request);

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000; // em segundos
        const statusCode = response.statusCode;

        this.metricsService.recordHttpRequest(
          method,
          route,
          statusCode,
          duration,
        );
      }),
      catchError((error) => {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = error.status || 500;

        this.metricsService.recordHttpRequest(
          method,
          route,
          statusCode,
          duration,
        );

        throw error;
      }),
    );
  }

  private getRoute(request: Request): string {
    // Tenta obter a rota do Express
    if (request.route?.path) {
      return request.route.path;
    }

    // Fallback para o path da URL
    const path = request.path;

    // Normaliza rotas com parâmetros (ex: /users/123 -> /users/:id)
    const normalizedPath = path
      .split('/')
      .map((segment) => {
        // Se o segmento parece ser um ID (número ou UUID), substitui por :id
        if (
          /^\d+$/.test(segment) ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            segment,
          )
        ) {
          return ':id';
        }
        return segment;
      })
      .join('/');

    return normalizedPath || '/';
  }
}
