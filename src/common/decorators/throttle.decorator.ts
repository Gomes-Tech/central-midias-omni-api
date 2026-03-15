import { Throttle } from '@nestjs/throttler';

/**
 * Decorator para limitar rate de login - 5 tentativas por 15 minutos
 */
export const ThrottleLogin = () =>
  Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } });

/**
 * Decorator para limitar rate de upload - 10 uploads por hora
 */
export const ThrottleUpload = () =>
  Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } });

/**
 * Decorator para limitar rate de geração de tokens - 3 tentativas por hora
 */
export const ThrottleTokenGeneration = () =>
  Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } });

/**
 * Decorator para limitar rate de reset de senha - 3 tentativas por hora
 */
export const ThrottlePasswordReset = () =>
  Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } });
