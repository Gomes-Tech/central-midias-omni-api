import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { authorizationToLoginPayload } from '../utils';

export const UserId = createParamDecorator((_, ctx: ExecutionContext) => {
  const { authorization } = ctx.switchToHttp().getRequest().headers;

  const loginPayload = authorizationToLoginPayload(authorization);

  return loginPayload?.id;
});
