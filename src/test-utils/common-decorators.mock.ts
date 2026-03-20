export function Sanitize(): PropertyDecorator {
  return () => undefined;
}

export function Roles(): MethodDecorator & ClassDecorator {
  return () => undefined;
}

export function UserId(): ParameterDecorator {
  return () => undefined;
}
