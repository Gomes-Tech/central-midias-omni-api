import { generateId } from '@common/utils';
import { Prisma } from '@prisma/client';

type ManagerAssignment = { managerId: string };

/**
 * Substitui o vínculo gestor↔subordinado na organização.
 * `undefined` = não altera; `[]` = remove gestor; `[{ managerId }]` = define (1 por org).
 */
export async function syncManagerAssignments(
  tx: Prisma.TransactionClient,
  subordinateId: string,
  organizationId: string,
  assignments: ManagerAssignment[] | undefined,
): Promise<void> {
  if (assignments === undefined) {
    return;
  }

  await tx.userHierarchy.deleteMany({
    where: {
      subordinateId,
      organizationId,
    },
  });

  const managerId = assignments[0]?.managerId;
  if (!managerId) {
    return;
  }

  await tx.userHierarchy.create({
    data: {
      id: generateId(),
      managerId,
      subordinateId,
      organizationId,
    },
  });
}
