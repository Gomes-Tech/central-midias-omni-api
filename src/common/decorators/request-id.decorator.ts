import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REQUEST_ID_KEY } from '../interceptors/request-id.interceptor';

/**
 * Decorator para obter o Request ID da requisição atual
 *
 * @example
 * ```typescript
 * @Get()
 * async getData(@RequestId() requestId: string) {
 *   console.log('Request ID:', requestId);
 *   return this.service.getData();
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Get()
 * async getData(@Request() req) {
 *   const requestId = req.requestId; // Também disponível diretamente no request
 *   return this.service.getData();
 * }
 * ```
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request[REQUEST_ID_KEY];
  },
);
