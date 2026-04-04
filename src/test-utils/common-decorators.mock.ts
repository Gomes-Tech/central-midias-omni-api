import { createParamDecorator, SetMetadata } from '@nestjs/common';

export const OrgId = createParamDecorator(() => 'test-organization-id');

export const MAX_FILE_SIZE_KEY = 'maxFileSize';

export const MaxFileSize = (maxSizeInBytes?: number, maxSizeInMB?: number) => {
  let sizeInBytes = 5 * 1024 * 1024;
  if (maxSizeInMB !== undefined) {
    sizeInBytes = maxSizeInMB * 1024 * 1024;
  } else if (maxSizeInBytes !== undefined) {
    sizeInBytes = maxSizeInBytes;
  }
  return SetMetadata(MAX_FILE_SIZE_KEY, sizeInBytes);
};

export function IsStrongPassword(
  _validationOptions?: object,
): PropertyDecorator {
  return () => undefined;
}

const noopMethodDecorator: MethodDecorator = (_t, _k, d) => d;

export function ThrottleLogin(): MethodDecorator {
  return noopMethodDecorator;
}

export function ThrottleTokenGeneration(): MethodDecorator {
  return noopMethodDecorator;
}

export function ThrottlePasswordReset(): MethodDecorator {
  return noopMethodDecorator;
}

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
