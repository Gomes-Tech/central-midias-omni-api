export function Sanitize(): PropertyDecorator {
  return () => undefined;
}

export function Roles(): MethodDecorator & ClassDecorator {
  return () => undefined;
}

export const PERMISSION_KEY = 'permission';

export function RequirePermission(): MethodDecorator & ClassDecorator {
  return () => undefined;
}

export function Public(): MethodDecorator & ClassDecorator {
  return () => undefined;
}

export function UserId(): ParameterDecorator {
  return () => undefined;
}
