"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../src/common/utils");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const OMNI_ORGANIZATION_ID = '28d990f0-ceee-4ccb-a6be-8fb04d779c22';
const categories = [
    {
        name: 'Catálogo',
        children: [
            {
                name: 'Impressos',
                children: [
                    { name: 'PDVs' },
                    { name: 'Ambientação das lojas' },
                    { name: 'Crachás' },
                    { name: 'Cartão de visitas' },
                    { name: 'Folhetos' },
                    { name: 'Outdoor' },
                    { name: 'Banners' },
                ],
            },
            {
                name: 'Digitais',
                children: [
                    { name: 'Vídeos' },
                    { name: 'Spot de rádio' },
                    { name: 'Script influenciador' },
                    { name: 'Cartão de visita digital' },
                    { name: 'Assinatura de e-mail' },
                    { name: 'Anúncio de vagas' },
                    { name: 'Telas de fundo' },
                    { name: 'Templates de apresentação' },
                ],
            },
            {
                name: 'Manuais',
                children: [
                    { name: 'Identidade visual' },
                    { name: 'Fachada e ambientação' },
                    { name: 'Redes sociais' },
                ],
            },
            {
                name: 'Banco de imagens',
                children: [{ name: 'Repositório' }],
            },
            {
                name: 'Segmentação Região',
                children: [
                    { name: 'Norte' },
                    { name: 'Nordeste' },
                    { name: 'Centro-Oeste' },
                    { name: 'Sudeste' },
                    { name: 'Sul' },
                ],
            },
            {
                name: 'PLUSOFT',
            },
        ],
    },
    {
        name: 'Campanhas',
    },
    {
        name: 'Redes Sociais',
    },
    {
        name: 'Feirões',
    },
    {
        name: 'Brindes',
    },
    {
        name: 'Documentos',
    },
    {
        name: 'FAQ',
    },
];
async function createCategoryTree(organizationId, items, parentId = null, parentSlugPath = null) {
    for (const [index, item] of items.entries()) {
        const slug = (0, utils_1.toSlug)(item.name);
        const slugPath = (0, utils_1.buildSlugPath)(parentSlugPath, slug);
        const category = await prisma.category.upsert({
            where: {
                organizationId_slugPath: {
                    organizationId,
                    slugPath,
                },
            },
            update: {
                name: item.name,
                slug,
                slugPath,
                parentId,
                order: index + 1,
                isActive: true,
                isDeleted: false,
                deletedAt: null,
            },
            create: {
                id: (0, utils_1.generateId)(),
                name: item.name,
                slug,
                slugPath,
                organizationId,
                parentId,
                order: index + 1,
            },
        });
        if (item.children?.length) {
            await createCategoryTree(organizationId, item.children, category.id, category.slugPath);
        }
    }
}
async function main() {
    const organization = await prisma.organization.findFirst({
        where: {
            id: OMNI_ORGANIZATION_ID,
            isDeleted: false,
        },
        select: {
            id: true,
            name: true,
        },
    });
    if (!organization) {
        console.log(`Organização omni não encontrada: ${OMNI_ORGANIZATION_ID}. Nenhuma categoria foi seedada.`);
        return;
    }
    console.log(`Seedando categorias para: ${organization.name}`);
    await createCategoryTree(organization.id, categories);
    console.log('Categorias seedadas com sucesso.');
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=categories.seed.js.map