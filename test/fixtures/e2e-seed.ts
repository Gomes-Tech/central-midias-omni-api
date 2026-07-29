import { Action } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const E2E_PASSWORD = 'V9!rK#4pT@7zL$2qX8mF';

export const E2E_IDS = {
  userId: '11111111-1111-4111-8111-111111111111',
  portalUserId: '12121212-1212-4121-8121-121212121212',
  roleId: '22222222-2222-4222-8222-222222222222',
  editorRoleId: '99999999-9999-4999-8999-999999999999',
  orgId: '33333333-3333-4333-8333-333333333333',
  otherOrgId: '34343434-3434-4434-8434-343434343434',
  memberId: '44444444-4444-4444-8444-444444444444',
  portalMemberId: '45454545-4545-4454-8454-454545454545',
  tagId: '55555555-5555-4555-8555-555555555555',
  categoryId: '66666666-6666-4666-8666-666666666666',
  categoryBId: '67676767-6767-4676-8676-676767676767',
  categoryCId: '68686868-6868-4686-8686-686868686868',
  bannerId: '77777777-7777-4777-8777-777777777777',
  socialHighlightId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  materialId: '88888888-8888-4888-8888-888888888888',
  materialCategoryCId: '89898989-8989-4898-8989-898989898989',
  customizableMaterialId: '8a8a8a8a-8a8a-4a8a-8a8a-8a8a8a8a8a8a',
  materialTemplateId: '8b8b8b8b-8b8b-4b8b-8b8b-8b8b8b8b8b8b',
  materialBaseFileId: '8c8c8c8c-8c8c-4c8c-8c8c-8c8c8c8c8c8c',
  eventTypeId: 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
  eventNoCategoryId: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
  eventCategoryAId: 'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2',
  eventCategoryCId: 'e3e3e3e3-e3e3-4e3e-8e3e-e3e3e3e3e3e3',
  eventDeletedId: 'e4e4e4e4-e4e4-4e4e-8e4e-e4e4e4e4e4e4',
  assetId: 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1',
} as const;

const MODULE_DEFS = [
  { name: 'organizations', label: 'Organizações' },
  { name: 'roles', label: 'Perfis' },
  { name: 'users', label: 'Usuários' },
  { name: 'members', label: 'Membros' },
  { name: 'categories', label: 'Categorias' },
  { name: 'banners', label: 'Banners' },
  { name: 'social-highlights', label: 'Ta na Rede' },
  { name: 'materials', label: 'Materiais' },
  { name: 'tags', label: 'Tags' },
  { name: 'reports', label: 'Relatórios' },
  { name: 'faqs', label: 'FAQ' },
  { name: 'calendar', label: 'Calendário' },
  { name: 'assets', label: 'Assets' },
] as const;

const ALL_ACTIONS: Action[] = [
  Action.CREATE,
  Action.READ,
  Action.UPDATE,
  Action.DELETE,
];

export type E2eStore = {
  users: Record<string, unknown>[];
  roles: Record<string, unknown>[];
  modules: Record<string, unknown>[];
  rolePermissions: Record<string, unknown>[];
  organizations: Record<string, unknown>[];
  members: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  banners: Record<string, unknown>[];
  socialHighlights: Record<string, unknown>[];
  materials: Record<string, unknown>[];
  materialFiles: Record<string, unknown>[];
  materialTemplates: Record<string, unknown>[];
  materialTemplateAssets: Record<string, unknown>[];
  categoryRoleAccesses: Record<string, unknown>[];
  calendarEventTypes: Record<string, unknown>[];
  calendarEvents: Record<string, unknown>[];
  calendarEventMaterials: Record<string, unknown>[];
  passwordResetTokens: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  tagSearches: Record<string, unknown>[];
  assets: Record<string, unknown>[];
};

export function createE2eSeed(): E2eStore {
  const now = new Date();
  const passwordHash = bcrypt.hashSync(E2E_PASSWORD, 10);

  const modules = MODULE_DEFS.map((mod, index) => ({
    id: `e2e-module-${index + 1}`,
    name: mod.name,
    label: mod.label,
  }));

  const rolePermissions = modules.flatMap((mod) =>
    ALL_ACTIONS.map((action, actionIndex) => ({
      id: `e2e-rp-${mod.id}-${actionIndex}`,
      roleId: E2E_IDS.roleId,
      moduleId: mod.id,
      action,
      module: mod,
    })),
  );

  const role = {
    id: E2E_IDS.roleId,
    name: 'ADMIN',
    label: 'Administrador',
    isSystem: true,
    canAccessBackoffice: true,
    canHaveSubordinates: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    permissions: rolePermissions,
    categoryRoleAccesses: [] as Record<string, unknown>[],
  };

  const memberRole = {
    id: E2E_IDS.editorRoleId,
    name: 'EDITOR',
    label: 'Editor',
    isSystem: false,
    canAccessBackoffice: false,
    canHaveSubordinates: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    permissions: rolePermissions.slice(0, 4),
    categoryRoleAccesses: [] as Record<string, unknown>[],
  };

  const user = {
    id: E2E_IDS.userId,
    name: 'Admin E2E',
    email: 'admin@admin.com',
    password: passwordHash,
    taxIdentifier: '93978425017',
    phone: null,
    socialReason: null,
    avatarKey: null,
    birthDate: null,
    admissionDate: null,
    isFirstAccess: false,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    globalRoleId: E2E_IDS.roleId,
    globalRole: role,
    members: [] as Record<string, unknown>[],
  };

  const portalUser = {
    id: E2E_IDS.portalUserId,
    name: 'Portal E2E',
    email: 'portal@e2e.com',
    password: passwordHash,
    taxIdentifier: '12345678909',
    phone: null,
    socialReason: null,
    avatarKey: null,
    birthDate: null,
    admissionDate: null,
    isFirstAccess: false,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    globalRoleId: null,
    globalRole: null,
    members: [] as Record<string, unknown>[],
  };

  const organization = {
    id: E2E_IDS.orgId,
    name: 'Organização E2E',
    slug: 'org-e2e',
    domain: null,
    shouldAttachUsersByDomain: false,
    avatarKey: null,
    isActive: true,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const otherOrganization = {
    ...organization,
    id: E2E_IDS.otherOrgId,
    name: 'Outra Organização E2E',
    slug: 'outra-org-e2e',
  };

  const member = {
    id: E2E_IDS.memberId,
    organizationId: E2E_IDS.orgId,
    userId: E2E_IDS.userId,
    roleId: E2E_IDS.roleId,
    createdAt: now,
    updatedAt: now,
    role,
    organization,
    user,
  };

  const portalMember = {
    id: E2E_IDS.portalMemberId,
    organizationId: E2E_IDS.orgId,
    userId: E2E_IDS.portalUserId,
    roleId: E2E_IDS.editorRoleId,
    createdAt: now,
    updatedAt: now,
    role: memberRole,
    organization,
    user: portalUser,
  };

  user.members = [member];
  portalUser.members = [portalMember];

  const category = {
    id: E2E_IDS.categoryId,
    organizationId: E2E_IDS.orgId,
    name: 'Categoria E2E',
    slug: 'categoria-e2e',
    slugPath: 'categoria-e2e',
    isActive: true,
    order: 1,
    parentId: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const categoryB = {
    id: E2E_IDS.categoryBId,
    organizationId: E2E_IDS.orgId,
    name: 'Categoria B',
    slug: 'categoria-b',
    slugPath: 'categoria-b',
    isActive: true,
    order: 2,
    parentId: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const categoryC = {
    id: E2E_IDS.categoryCId,
    organizationId: E2E_IDS.orgId,
    name: 'Categoria C',
    slug: 'categoria-c',
    slugPath: 'categoria-c',
    isActive: true,
    order: 3,
    parentId: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const categoryRoleAccess = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    roleId: E2E_IDS.roleId,
    categoryId: E2E_IDS.categoryId,
    organizationId: E2E_IDS.orgId,
    category,
  };

  const editorAccessA = {
    id: 'abababab-abab-4aba-8aba-abababababab',
    roleId: E2E_IDS.editorRoleId,
    categoryId: E2E_IDS.categoryId,
    organizationId: E2E_IDS.orgId,
    category,
  };

  const editorAccessB = {
    id: 'acacacac-acac-4aca-8aca-acacacacacac',
    roleId: E2E_IDS.editorRoleId,
    categoryId: E2E_IDS.categoryBId,
    organizationId: E2E_IDS.orgId,
    category: categoryB,
  };

  const adminAccessC = {
    id: 'adadadad-adad-4ada-8ada-adadadadadad',
    roleId: E2E_IDS.roleId,
    categoryId: E2E_IDS.categoryCId,
    organizationId: E2E_IDS.orgId,
    category: categoryC,
  };

  role.categoryRoleAccesses = [categoryRoleAccess];
  memberRole.categoryRoleAccesses = [editorAccessA, editorAccessB];

  const tag = {
    id: E2E_IDS.tagId,
    organizationId: E2E_IDS.orgId,
    name: 'Tag E2E',
    createdAt: now,
    updatedAt: now,
    _count: { material: 0, tagSearches: 0 },
  };

  const asset = {
    id: E2E_IDS.assetId,
    organizationId: E2E_IDS.orgId,
    name: 'Logo E2E',
    fileKey: `organizations/${E2E_IDS.orgId}/assets/${E2E_IDS.assetId}/logo.png`,
    mimeType: 'image/png',
    size: 8,
    createdAt: now,
    updatedAt: now,
  };

  const banner = {
    id: E2E_IDS.bannerId,
    organizationId: E2E_IDS.orgId,
    mobileImageKey: 'banners/mobile.png',
    desktopImageKey: 'banners/desktop.png',
    name: 'Banner E2E',
    link: null,
    order: 1,
    isActive: true,
    initialDate: null,
    finishDate: null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const socialHighlight = {
    id: E2E_IDS.socialHighlightId,
    organizationId: E2E_IDS.orgId,
    mobileImageKey: 'social-highlights/mobile.png',
    desktopImageKey: 'social-highlights/desktop.png',
    name: 'Destaque Social E2E',
    link: null,
    order: 1,
    isActive: true,
    initialDate: null,
    finishDate: null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const material = {
    id: E2E_IDS.materialId,
    name: 'Material E2E',
    description: 'Descrição',
    categoryId: E2E_IDS.categoryId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    tags: [tag],
    materialFiles: [] as Record<string, unknown>[],
    category,
  };

  const materialCategoryC = {
    id: E2E_IDS.materialCategoryCId,
    name: 'Material Categoria C',
    description: 'Descrição',
    categoryId: E2E_IDS.categoryCId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    tags: [] as Record<string, unknown>[],
    materialFiles: [] as Record<string, unknown>[],
    category: categoryC,
  };

  const materialBaseFile = {
    id: E2E_IDS.materialBaseFileId,
    materialId: E2E_IDS.customizableMaterialId,
    imageKey: 'materials/customizable/base.png',
    mimeType: 'image/png',
    size: 1024,
  };

  const customizableMaterial = {
    id: E2E_IDS.customizableMaterialId,
    name: 'Material Customizável E2E',
    description: 'Descrição',
    categoryId: E2E_IDS.categoryId,
    requiresAcceptance: false,
    hasExternalLink: false,
    externalLink: null,
    hasTextCopy: false,
    textCopy: null,
    isCustomizable: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    tags: [] as Record<string, unknown>[],
    category,
  };

  const templateDocument = {
    version: 1,
    canvas: { width: 1080, height: 1080 },
    layerOrder: ['template-asset', 'template-text'],
    layers: [
      {
        id: 'template-asset',
        type: 'asset',
        name: 'Logo',
        assetId: E2E_IDS.assetId,
        x: 20,
        y: 20,
        width: 100,
        height: 100,
        rotation: 0,
        isVisible: true,
        editableProperties: [],
      },
      {
        id: 'template-text',
        type: 'text',
        name: 'Nome',
        value: 'Nome do agente',
        x: 100,
        y: 900,
        rotation: 0,
        fontSize: 40,
        fontFamily: 'Arial',
        fill: '#111111',
        isVisible: true,
        editableProperties: ['value'],
        profileBinding: 'NAME',
      },
    ],
  };

  const materialTemplate = {
    id: E2E_IDS.materialTemplateId,
    organizationId: E2E_IDS.orgId,
    materialId: E2E_IDS.customizableMaterialId,
    baseMaterialFileId: E2E_IDS.materialBaseFileId,
    status: 'PUBLISHED',
    schemaVersion: 1,
    document: templateDocument,
    legacyImport: null,
    revision: 0,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const eventType = {
    id: E2E_IDS.eventTypeId,
    organizationId: E2E_IDS.orgId,
    name: 'Campanha',
    slug: 'campanha',
    color: '#EA580C',
    description: 'Campanhas',
    order: 1,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const eventNoCategory = {
    id: E2E_IDS.eventNoCategoryId,
    organizationId: E2E_IDS.orgId,
    eventTypeId: E2E_IDS.eventTypeId,
    title: 'Evento Geral',
    description: 'Sem materiais',
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    endDate: new Date('2026-05-10T23:59:59.000Z'),
    externalUrl: null,
    createdByUserId: E2E_IDS.userId,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const eventCategoryA = {
    id: E2E_IDS.eventCategoryAId,
    organizationId: E2E_IDS.orgId,
    eventTypeId: E2E_IDS.eventTypeId,
    title: 'Evento Material Categoria A',
    description: 'Com material na categoria A',
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    endDate: new Date('2026-05-10T23:59:59.000Z'),
    externalUrl: null,
    createdByUserId: E2E_IDS.userId,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const eventCategoryC = {
    id: E2E_IDS.eventCategoryCId,
    organizationId: E2E_IDS.orgId,
    eventTypeId: E2E_IDS.eventTypeId,
    title: 'Evento Material Categoria C',
    description: 'Com material na categoria C',
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    endDate: new Date('2026-05-10T23:59:59.000Z'),
    externalUrl: null,
    createdByUserId: E2E_IDS.userId,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const eventDeleted = {
    id: E2E_IDS.eventDeletedId,
    organizationId: E2E_IDS.orgId,
    eventTypeId: E2E_IDS.eventTypeId,
    title: 'Evento Deletado',
    description: 'Soft deleted',
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    endDate: new Date('2026-05-10T23:59:59.000Z'),
    externalUrl: null,
    createdByUserId: E2E_IDS.userId,
    isActive: false,
    isDeleted: true,
    deletedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const calendarEventMaterials = [
    {
      eventId: E2E_IDS.eventCategoryAId,
      materialId: E2E_IDS.materialId,
    },
    {
      eventId: E2E_IDS.eventCategoryCId,
      materialId: E2E_IDS.materialCategoryCId,
    },
  ];

  return {
    users: [user, portalUser],
    roles: [role, memberRole],
    modules,
    rolePermissions,
    organizations: [organization, otherOrganization],
    members: [member, portalMember],
    tags: [tag],
    categories: [category, categoryB, categoryC],
    banners: [banner],
    socialHighlights: [socialHighlight],
    materials: [material, materialCategoryC, customizableMaterial],
    materialFiles: [materialBaseFile],
    materialTemplates: [materialTemplate],
    materialTemplateAssets: [
      { templateId: E2E_IDS.materialTemplateId, assetId: E2E_IDS.assetId },
    ],
    categoryRoleAccesses: [
      categoryRoleAccess,
      editorAccessA,
      editorAccessB,
      adminAccessC,
    ],
    calendarEventTypes: [eventType],
    calendarEvents: [
      eventNoCategory,
      eventCategoryA,
      eventCategoryC,
      eventDeleted,
    ],
    calendarEventMaterials,
    passwordResetTokens: [],
    logs: [],
    tagSearches: [],
    assets: [asset],
  };
}
