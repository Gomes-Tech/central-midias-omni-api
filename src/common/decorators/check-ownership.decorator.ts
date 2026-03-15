import { SetMetadata } from '@nestjs/common';

export const CHECK_OWNERSHIP_KEY = 'checkOwnership';

export interface OwnershipCheckOptions {
  /**
   * Nome do parâmetro que contém o ID do recurso (ex: 'id')
   */
  resourceIdParam?: string;
  /**
   * Nome do campo no recurso que contém o ID do dono (ex: 'userId', 'createdById')
   */
  ownerIdField?: string;
  /**
   * Se true, admins podem acessar qualquer recurso
   */
  allowAdmin?: boolean;
  /**
   * Função customizada para verificar ownership
   */
  checkFn?: (
    resourceId: string,
    userId: string,
    userRole?: string,
  ) => Promise<boolean>;
}

/**
 * Decorator para marcar endpoints que precisam verificar ownership
 * Protege contra IDOR (Insecure Direct Object Reference)
 */
export const CheckOwnership = (options?: OwnershipCheckOptions) =>
  SetMetadata(CHECK_OWNERSHIP_KEY, {
    resourceIdParam: options?.resourceIdParam || 'id',
    ownerIdField: options?.ownerIdField || 'userId',
    allowAdmin: options?.allowAdmin !== false, // default true
    checkFn: options?.checkFn,
  });
