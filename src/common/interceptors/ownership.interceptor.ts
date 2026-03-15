import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import {
  CHECK_OWNERSHIP_KEY,
  OwnershipCheckOptions,
} from '../decorators/check-ownership.decorator';
import { SecurityLoggerService } from '@infrastructure/security';

@Injectable()
export class OwnershipInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private securityLogger: SecurityLoggerService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const options = this.reflector.getAllAndOverride<OwnershipCheckOptions>(
      CHECK_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há configuração de ownership, permite acesso
    if (!options) {
      return next.handle();
    }

    const user = request.user;
    if (!user || !user.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const resourceId = request.params[options.resourceIdParam || 'id'];
    if (!resourceId) {
      // Se não há ID no parâmetro, pode ser que não precise verificar ownership
      return next.handle();
    }

    // Se é admin e allowAdmin é true, permite acesso
    if (options.allowAdmin && user.role === 'admin') {
      return next.handle();
    }

    // Se há função customizada, usa ela
    if (options.checkFn) {
      const hasAccess = await options.checkFn(resourceId, user.id, user.role);
      if (!hasAccess) {
        this.logForbiddenAccess(
          user.id,
          request.url,
          request.method,
          request.ip,
        );
        throw new ForbiddenException(
          'Você não tem permissão para acessar este recurso',
        );
      }
      return next.handle();
    }

    // Verificação padrão: busca o recurso e verifica ownership
    // Esta verificação será feita no use case, então aqui apenas logamos
    // O use case deve lançar ForbiddenException se não tiver acesso
    return next.handle();
  }

  private logForbiddenAccess(
    userId: string,
    endpoint: string,
    method: string,
    ip: string,
  ): void {
    this.securityLogger.logForbiddenAccess(
      userId,
      endpoint,
      method,
      ip,
      'Ownership check failed',
      'unknown',
    );
  }
}
