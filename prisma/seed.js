"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
const ALL_ACTIONS = [
    client_1.Action.CREATE,
    client_1.Action.READ,
    client_1.Action.UPDATE,
    client_1.Action.DELETE,
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
        { id: (0, uuid_1.v4)(), name: 'organizations', label: 'Organizações' },
        { id: (0, uuid_1.v4)(), name: 'roles', label: 'Perfis' },
        { id: (0, uuid_1.v4)(), name: 'users', label: 'Usuários' },
        { id: (0, uuid_1.v4)(), name: 'members', label: 'Membros' },
        { id: (0, uuid_1.v4)(), name: 'categories', label: 'Categorias' },
        { id: (0, uuid_1.v4)(), name: 'banners', label: 'Banners' },
        { id: (0, uuid_1.v4)(), name: 'social-highlights', label: 'Ta na Rede' },
        { id: (0, uuid_1.v4)(), name: 'materials', label: 'Materiais' },
        { id: (0, uuid_1.v4)(), name: 'tags', label: 'Tags' },
        { id: (0, uuid_1.v4)(), name: 'reports', label: 'Relatórios' },
        { id: (0, uuid_1.v4)(), name: 'faqs', label: 'FAQ' },
        { id: (0, uuid_1.v4)(), name: 'calendar', label: 'Calendário' },
    ];
    const roleId = (0, uuid_1.v4)();
    const rolePermissions = moduleRows.flatMap((mod) => ALL_ACTIONS.map((action) => ({
        id: (0, uuid_1.v4)(),
        roleId,
        moduleId: mod.id,
        action,
    })));
    const hashedPassword = await bcrypt_1.default.hash('V9!rK#4pT@7zL$2qX8mF', 14);
    const userId = (0, uuid_1.v4)();
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
    console.log('Nota: rotas do backoffice exigem um Member (usuário + organização + role). Sem organização seedada, o admin ainda não passa no PlatformPermissionGuard.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map