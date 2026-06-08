const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncGlobalRoleWithOrganizationCategories(
  roleId,
  organizationId,
) {
  const categories = await prisma.category.findMany({
    where: {
      organizationId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (categories.length === 0) {
    return 0;
  }

  const existingAccesses = await prisma.categoryRoleAccess.findMany({
    where: {
      roleId,
      organizationId,
      categoryId: { in: categories.map((category) => category.id) },
    },
    select: { categoryId: true },
  });

  const existingCategoryIds = new Set(
    existingAccesses.map((access) => access.categoryId),
  );

  const accessesToCreate = categories
    .filter((category) => !existingCategoryIds.has(category.id))
    .map((category) => ({
      id: randomUUID(),
      categoryId: category.id,
      roleId,
      organizationId,
    }));

  if (accessesToCreate.length === 0) {
    return 0;
  }

  const result = await prisma.categoryRoleAccess.createMany({
    data: accessesToCreate,
    skipDuplicates: true,
  });

  return result.count;
}

async function main() {
  const [globalRoles, organizations] = await Promise.all([
    prisma.role.findMany({
      where: {
        deletedAt: null,
        canAccessBackoffice: true,
      },
      select: {
        id: true,
        name: true,
        label: true,
      },
      orderBy: [{ label: 'asc' }],
    }),
    prisma.organization.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: 'asc' }],
    }),
  ]);

  if (globalRoles.length === 0) {
    console.log('Nenhum perfil global ativo encontrado.');
    return;
  }

  if (organizations.length === 0) {
    console.log('Nenhuma organização ativa encontrada.');
    return;
  }

  console.log(
    `Sincronizando ${globalRoles.length} perfil(is) global(is) em ${organizations.length} organização(ões)...`,
  );

  let totalCreated = 0;

  for (const role of globalRoles) {
    let roleCreated = 0;

    for (const organization of organizations) {
      const created = await syncGlobalRoleWithOrganizationCategories(
        role.id,
        organization.id,
      );

      roleCreated += created;
      totalCreated += created;
    }

    console.log(
      `- ${role.label} (${role.name}): ${roleCreated} vínculo(s) criado(s)`,
    );
  }

  console.log(`Sincronização concluída. Total de vínculos criados: ${totalCreated}`);
}

main()
  .catch((error) => {
    console.error('Falha ao sincronizar perfis globais:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
