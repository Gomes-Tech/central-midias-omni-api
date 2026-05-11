const { randomUUID } = require('node:crypto');
const { Action, PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const ALL_ACTIONS = [
  Action.CREATE,
  Action.READ,
  Action.UPDATE,
  Action.DELETE,
];

async function main() {
  const alreadySeeded = await prisma.seedStatus.findUnique({
    where: { id: 'main-seed' },
  });

  if (alreadySeeded) {
    console.log('Banco de dados já foi seedado. Abortando seed.');
    return;
  }

  const moduleRows = [
    { id: randomUUID(), name: 'organizations', label: 'Organizações' },
    { id: randomUUID(), name: 'roles', label: 'Perfis' },
    { id: randomUUID(), name: 'users', label: 'Usuários' },
    { id: randomUUID(), name: 'members', label: 'Membros' },
    { id: randomUUID(), name: 'categories', label: 'Categorias' },
    { id: randomUUID(), name: 'banners', label: 'Banners' },
    { id: randomUUID(), name: 'materials', label: 'Materiais' },
    { id: randomUUID(), name: 'tags', label: 'Tags' },
  ];

  const roleId = randomUUID();

  const rolePermissions = moduleRows.flatMap((mod) =>
    ALL_ACTIONS.map((action) => ({
      id: randomUUID(),
      roleId,
      moduleId: mod.id,
      action,
    })),
  );

  const hashedPassword = await bcrypt.hash('V9!rK#4pT@7zL$2qX8mF', 14);
  const userId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.module.createMany({ data: moduleRows });

    await tx.role.create({
      data: {
        id: roleId,
        name: 'ADMIN',
        label: 'Administrador',
        isSystem: true,
        canAccessBackoffice: true,
        canHaveSubordinates: false,
      },
    });

    await tx.rolePermission.createMany({ data: rolePermissions });

    await tx.user.create({
      data: {
        id: userId,
        name: 'Admin',
        email: 'admin@admin.com',
        password: hashedPassword,
        taxIdentifier: '93978425017',
        isActive: true,
        isFirstAccess: false,
        globalRole: {
          connect: {
            id: roleId,
          },
        },
      },
    });

    await tx.seedStatus.create({
      data: { id: 'main-seed', executedAt: new Date() },
    });
  });

  console.log('Seed concluído com sucesso!');
  console.log(
    'Nota: rotas do backoffice exigem um Member (usuário + organização + role). Sem organização seedada, o admin ainda não passa no PlatformPermissionGuard.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
