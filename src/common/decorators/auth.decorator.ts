// auth-type.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const AUTH_TYPE_KEY = 'auth_type';
export const AuthType = (type: string[]) => SetMetadata(AUTH_TYPE_KEY, type);
