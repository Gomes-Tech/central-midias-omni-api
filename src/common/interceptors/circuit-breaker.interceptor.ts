import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CircuitBreakerService } from '@infrastructure/circuit-breaker';
import { CIRCUIT_BREAKER_KEY } from '../decorators/circuit-breaker.decorator';

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<{
      key: string;
      options?: any;
    }>(CIRCUIT_BREAKER_KEY, context.getHandler());

    // Se não houver metadata, não aplicar circuit breaker
    if (!metadata) {
      return next.handle();
    }

    const { key, options } = metadata;

    // Executar com circuit breaker
    return from(
      this.circuitBreakerService.execute(
        key,
        () => next.handle().toPromise(),
        options,
      ),
    ).pipe(
      switchMap((result) => {
        return new Observable((subscriber) => {
          subscriber.next(result);
          subscriber.complete();
        });
      }),
    );
  }
}
