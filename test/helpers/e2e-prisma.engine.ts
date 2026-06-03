import type { E2eStore } from '../fixtures/e2e-seed';

type QueryArgs = {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  data?: Record<string, unknown>;
  orderBy?: unknown;
  skip?: number;
  take?: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getField(record: Record<string, unknown>, key: string): unknown {
  if (key in record) {
    return record[key];
  }
  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  if (camel in record) {
    return record[camel];
  }
  return undefined;
}

function matchScalar(
  fieldValue: unknown,
  condition: unknown,
  store: E2eStore,
): boolean {
  if (condition === undefined) {
    return true;
  }
  if (isPlainObject(condition)) {
    if ('equals' in condition) {
      return fieldValue === condition.equals;
    }
    if ('in' in condition && Array.isArray(condition.in)) {
      return condition.in.includes(fieldValue);
    }
    if ('contains' in condition && typeof fieldValue === 'string') {
      const term = String(condition.contains).toLowerCase();
      const value = fieldValue.toLowerCase();
      const mode = condition.mode === 'insensitive';
      return mode ? value.includes(term) : fieldValue.includes(String(condition.contains));
    }
    if ('is' in condition) {
      return fieldValue === condition.is;
    }
    if ('not' in condition) {
      return !matchScalar(fieldValue, condition.not, store);
    }
    return matchWhere(recordFromValue(fieldValue), condition as Record<string, unknown>, store);
  }
  return fieldValue === condition;
}

function recordFromValue(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function matchRelation(
  record: Record<string, unknown>,
  relationKey: string,
  filter: Record<string, unknown>,
  store: E2eStore,
): boolean {
  const related = resolveRelation(record, relationKey, store);
  if ('is' in filter) {
    if (filter.is === null) {
      return related === null || related === undefined;
    }
    return related !== null && related !== undefined;
  }
  if ('isNot' in filter) {
    if (filter.isNot === null) {
      return related !== null && related !== undefined;
    }
  }
  if ('some' in filter && Array.isArray(related)) {
    return related.some((item) =>
      matchWhere(item as Record<string, unknown>, filter.some as Record<string, unknown>, store),
    );
  }
  if ('every' in filter && Array.isArray(related)) {
    return related.every((item) =>
      matchWhere(item as Record<string, unknown>, filter.every as Record<string, unknown>, store),
    );
  }
  if (isPlainObject(related)) {
    return matchWhere(related, filter, store);
  }
  if (Array.isArray(related)) {
    return related.some((item) =>
      matchWhere(item as Record<string, unknown>, filter, store),
    );
  }
  return false;
}

function resolveRelation(
  record: Record<string, unknown>,
  relationKey: string,
  store: E2eStore,
): unknown {
  const direct = getField(record, relationKey);
  if (direct !== undefined) {
    return direct;
  }

  if (relationKey === 'globalRole' && record.globalRoleId) {
    return store.roles.find((r) => r.id === record.globalRoleId) ?? null;
  }
  if (relationKey === 'members' && record.id) {
    return store.members.filter((m) => m.userId === record.id);
  }
  if (relationKey === 'role' && record.roleId) {
    return store.roles.find((r) => r.id === record.roleId) ?? null;
  }
  if (relationKey === 'module' && record.moduleId) {
    return store.modules.find((m) => m.id === record.moduleId) ?? null;
  }
  if (relationKey === 'permissions' && record.id) {
    return store.rolePermissions.filter((p) => p.roleId === record.id);
  }
  if (relationKey === 'category' && record.categoryId) {
    return store.categories.find((c) => c.id === record.categoryId) ?? null;
  }
  if (relationKey === 'material' && record.materialId) {
    return store.materials.find((m) => m.id === record.materialId) ?? null;
  }
  if (relationKey === 'user' && record.userId) {
    return store.users.find((u) => u.id === record.userId) ?? null;
  }
  if (relationKey === 'categoryRoleAccesses' && record.id) {
    return store.categoryRoleAccesses.filter(
      (access) => access.roleId === record.id,
    );
  }
  if (relationKey === 'categoryRoleAccesses' && record.categoryId) {
    return store.categoryRoleAccesses.filter(
      (access) => access.categoryId === record.categoryId,
    );
  }
  if (relationKey === 'tags' && record.id) {
    const material = store.materials.find((m) => m.id === record.id);
    return material?.tags ?? [];
  }
  if (relationKey === 'materialFiles' && record.id) {
    return store.materialFiles.filter((f) => f.materialId === record.id);
  }
  if (relationKey === '_count') {
    return {
      material: Array.isArray(record.material) ? record.material.length : 0,
      tagSearches: store.tagSearches.filter((s) => s.tagId === record.id).length,
    };
  }

  return direct ?? null;
}

export function matchWhere(
  record: Record<string, unknown>,
  where: Record<string, unknown> | undefined,
  store: E2eStore,
): boolean {
  if (!where) {
    return true;
  }

  if (Array.isArray(where.AND)) {
    return where.AND.every((clause) =>
      matchWhere(record, clause as Record<string, unknown>, store),
    );
  }
  if (Array.isArray(where.OR)) {
    return where.OR.some((clause) =>
      matchWhere(record, clause as Record<string, unknown>, store),
    );
  }
  if (where.NOT) {
    return !matchWhere(record, where.NOT as Record<string, unknown>, store);
  }

  return Object.entries(where).every(([key, value]) => {
    if (['AND', 'OR', 'NOT'].includes(key)) {
      return true;
    }

    const fieldValue = getField(record, key);
    const relationKeys = [
      'globalRole',
      'members',
      'role',
      'module',
      'permissions',
      'category',
      'categoryRoleAccesses',
      'material',
      'tags',
      'materialFiles',
      '_count',
    ];

    if (relationKeys.includes(key) && isPlainObject(value)) {
      return matchRelation(record, key, value, store);
    }

    return matchScalar(fieldValue, value, store);
  });
}

function applySelect(
  record: Record<string, unknown>,
  select: Record<string, unknown> | undefined,
  store: E2eStore,
): Record<string, unknown> {
  if (!select) {
    return { ...record };
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      result[key] = getField(record, key);
      continue;
    }
    if (value === false) {
      continue;
    }
    if (key === '_count' && isPlainObject(value)) {
      result._count = resolveRelation(record, '_count', store);
      continue;
    }
    const related = resolveRelation(record, key, store);
    if (isPlainObject(value) && 'select' in value) {
      if (Array.isArray(related)) {
        result[key] = related.map((item) =>
          applySelect(item as Record<string, unknown>, value.select as Record<string, unknown>, store),
        );
      } else if (isPlainObject(related)) {
        result[key] = applySelect(related, value.select as Record<string, unknown>, store);
      } else {
        result[key] = related;
      }
    } else if (isPlainObject(related)) {
      result[key] = applySelect(related, isPlainObject(value) ? (value.select as Record<string, unknown>) : undefined, store);
    } else {
      result[key] = related;
    }
  }
  return result;
}

function sortRecords(
  records: Record<string, unknown>[],
  orderBy: unknown,
): Record<string, unknown>[] {
  if (!orderBy) {
    return records;
  }
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...records].sort((a, b) => {
    for (const order of orders) {
      if (!isPlainObject(order)) {
        continue;
      }
      const [field, direction] = Object.entries(order)[0] ?? [];
      if (!field) {
        continue;
      }
      const av = getField(a, field);
      const bv = getField(b, field);
      if (av === bv) {
        continue;
      }
      const cmp = String(av).localeCompare(String(bv));
      return direction === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

export function queryCollection(
  collection: Record<string, unknown>[],
  args: QueryArgs,
  store: E2eStore,
): Record<string, unknown>[] {
  let rows = collection.filter((row) =>
    matchWhere(row, args.where as Record<string, unknown> | undefined, store),
  );
  rows = sortRecords(rows, args.orderBy);
  if (typeof args.skip === 'number') {
    rows = rows.slice(args.skip);
  }
  if (typeof args.take === 'number') {
    rows = rows.slice(0, args.take);
  }
  return rows.map((row) => applySelect(row, args.select as Record<string, unknown> | undefined, store));
}

export function findFirst(
  collection: Record<string, unknown>[],
  args: QueryArgs,
  store: E2eStore,
): Record<string, unknown> | null {
  const rows = queryCollection(collection, { ...args, take: 1 }, store);
  return rows[0] ?? null;
}

export function findUnique(
  collection: Record<string, unknown>[],
  args: QueryArgs,
  store: E2eStore,
): Record<string, unknown> | null {
  const where = args.where ?? {};
  const matches = collection.filter((row) => matchWhere(row, where, store));
  return matches[0] ?? null;
}

export function throwIfNotFound<T>(value: T | null): T {
  if (!value) {
    const error = new Error('No record found');
    error.name = 'NotFoundError';
    throw error;
  }
  return value;
}

export function mergeCreateData(
  data: Record<string, unknown>,
  store: E2eStore,
): Record<string, unknown> {
  const row: Record<string, unknown> = { ...data };
  if (data.connect && isPlainObject(data.connect)) {
    return row;
  }
  if (row.globalRole && isPlainObject(row.globalRole) && row.globalRole.connect) {
    row.globalRoleId = (row.globalRole.connect as Record<string, unknown>).id;
    delete row.globalRole;
  }
  if (!row.createdAt) {
    row.createdAt = new Date();
  }
  if (!row.updatedAt) {
    row.updatedAt = new Date();
  }
  return row;
}
