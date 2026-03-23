import { BadRequestException } from '@common/filters';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const OrgId = createParamDecorator((_, ctx: ExecutionContext) => {
  const { 'x-tenant-id': tenantId } = ctx.switchToHttp().getRequest().headers;

  if (!tenantId) {
    throw new BadRequestException('Permissão insuficiente.');
  }

  return tenantId;
});
