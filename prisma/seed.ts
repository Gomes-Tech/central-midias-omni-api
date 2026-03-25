import { Action, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const ALL_ACTIONS: Action[] = [
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
    { id: uuidv4(), name: 'organizations', label: 'Organizações' },
    { id: uuidv4(), name: 'roles', label: 'Papéis' },
    { id: uuidv4(), name: 'users', label: 'Usuários' },
  ];

  const roleId = uuidv4();

  const rolePermissions = moduleRows.flatMap((mod) =>
    ALL_ACTIONS.map((action) => ({
      id: uuidv4(),
      roleId,
      moduleId: mod.id,
      action,
    })),
  );

  const hashedPassword = await bcrypt.hash('V9!rK#4pT@7zL$2qX8mF', 14);
  const userId = uuidv4();

  await prisma.$transaction(async (tx) => {
    await tx.module.createMany({ data: moduleRows });

    await tx.role.create({
      data: {
        id: roleId,
        name: 'ADMIN',
        label: 'Administrador',
        isSystem: true,
        canAccessBackoffice: true,
        canHaveSubordinates: true,
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
