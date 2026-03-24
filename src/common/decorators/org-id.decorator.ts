import { BadRequestException } from '@common/filters';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const OrgId = createParamDecorator((_, ctx: ExecutionContext) => {
  const { 'x-organization-id': organizationId } = ctx
    .switchToHttp()
    .getRequest().headers;

  if (!organizationId) {
    throw new BadRequestException('Permissão insuficiente.');
  }

  return organizationId;
});
