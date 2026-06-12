import { Action } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const E2E_PASSWORD = 'V9!rK#4pT@7zL$2qX8mF';

export const E2E_IDS = {
  userId: '11111111-1111-4111-8111-111111111111',
  roleId: '22222222-2222-4222-8222-222222222222',
  orgId: '33333333-3333-4333-8333-333333333333',
  memberId: '44444444-4444-4444-8444-444444444444',
  tagId: '55555555-5555-4555-8555-555555555555',
  categoryId: '66666666-6666-4666-8666-666666666666',
  bannerId: '77777777-7777-4777-8777-777777777777',
  socialHighlightId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  materialId: '88888888-8888-4888-8888-888888888888',
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
  categoryRoleAccesses: Record<string, unknown>[];
  passwordResetTokens: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  tagSearches: Record<string, unknown>[];
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
    id: '99999999-9999-4999-8999-999999999999',
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

  user.members = [member];

  const category = {
    id: E2E_IDS.categoryId,
    organizationId: E2E_IDS.orgId,
    name: 'Categoria E2E',
    slug: 'categoria-e2e',
    isActive: true,
    order: 1,
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

  role.categoryRoleAccesses = [categoryRoleAccess];
  memberRole.categoryRoleAccesses = [categoryRoleAccess];

  const tag = {
    id: E2E_IDS.tagId,
    organizationId: E2E_IDS.orgId,
    name: 'Tag E2E',
    createdAt: now,
    updatedAt: now,
    _count: { material: 0, tagSearches: 0 },
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

  return {
    users: [user],
    roles: [role, memberRole],
    modules,
    rolePermissions,
    organizations: [organization],
    members: [member],
    tags: [tag],
    categories: [category],
    banners: [banner],
    socialHighlights: [socialHighlight],
    materials: [material],
    materialFiles: [],
    categoryRoleAccesses: [categoryRoleAccess],
    passwordResetTokens: [],
    logs: [],
    tagSearches: [],
  };
}
