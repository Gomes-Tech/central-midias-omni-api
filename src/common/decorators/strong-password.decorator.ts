import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Valida se a senha é forte:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          // Se o valor for undefined, null ou string vazia, a validação passa
          // (para campos opcionais, a validação só ocorre se o valor for fornecido)
          if (value === undefined || value === null || value === '') {
            return true;
          }

          if (typeof value !== 'string') {
            return false;
          }

          // Mínimo 8 caracteres
          if (value.length < 8) {
            return false;
          }

          // Pelo menos uma letra maiúscula
          if (!/[A-Z]/.test(value)) {
            return false;
          }

          // Pelo menos uma letra minúscula
          if (!/[a-z]/.test(value)) {
            return false;
          }

          // Pelo menos um número
          if (!/\d/.test(value)) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return 'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números';
        },
      },
    });
  };
}
