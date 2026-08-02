import { Global, Injectable, Module } from '@nestjs/common';
import {
  findFirst,
  findUnique,
  mergeCreateData,
  queryCollection,
  throwIfNotFound,
} from './e2e-prisma.engine';
import { getE2eStore, resetE2eStore } from './e2e-prisma.store';

type QueryArgs = {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
  data?: Record<string, unknown>;
  orderBy?: unknown;
  skip?: number;
  take?: number;
};

function createDelegate(collectionKey: keyof ReturnType<typeof getE2eStore>) {
  return {
    findMany: async (args: QueryArgs = {}) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      return queryCollection(collection, args, store);
    },
    findFirst: async (args: QueryArgs = {}) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      return findFirst(collection, args, store);
    },
    findUnique: async (args: QueryArgs = {}) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      return findUnique(collection, args, store);
    },
    findFirstOrThrow: async (args: QueryArgs = {}) => {
      return throwIfNotFound(
        await createDelegate(collectionKey).findFirst(args),
      );
    },
    findUniqueOrThrow: async (args: QueryArgs = {}) => {
      return throwIfNotFound(
        await createDelegate(collectionKey).findUnique(args),
      );
    },
    count: async (args: QueryArgs = {}) => {
      const rows = await createDelegate(collectionKey).findMany(args);
      return rows.length;
    },
    create: async (args: {
      data: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      const row = mergeCreateData(args.data);
      collection.push(row);
      return (
        findFirst(
          collection,
          { where: { id: row.id }, select: args.select },
          store,
        ) ?? row
      );
    },
    createMany: async (args: {
      data: Record<string, unknown>[];
      skipDuplicates?: boolean;
    }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      let count = 0;
      for (const item of args.data) {
        const duplicate =
          args.skipDuplicates &&
          collection.some((row) => {
            if (collectionKey === 'tagSearches') {
              return (
                row.organizationId === item.organizationId &&
                row.userId === item.userId &&
                row.searchId === item.searchId &&
                row.tagName === item.tagName
              );
            }

            return row.id === item.id;
          });

        if (duplicate) {
          continue;
        }

        collection.push(mergeCreateData(item));
        count += 1;
      }
      return { count };
    },
    update: async (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      const row = findUnique(collection, { where: args.where }, store);
      if (!row) {
        throw new Error(`${String(collectionKey)} not found`);
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
    updateMany: async (args: {
      where?: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      let count = 0;
      for (const row of collection) {
        if (
          args.where &&
          !queryCollection([row], { where: args.where }, store).length
        ) {
          continue;
        }
        Object.assign(row, args.data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    },
    delete: async (args: { where: Record<string, unknown> }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      const index = collection.findIndex(
        (row) =>
          queryCollection([row], { where: args.where }, store).length > 0,
      );
      if (index < 0) {
        throw new Error(`${String(collectionKey)} not found`);
      }
      const [removed] = collection.splice(index, 1);
      return removed;
    },
    deleteMany: async (args: { where?: Record<string, unknown> } = {}) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      const before = collection.length;
      const remaining = collection.filter(
        (row) => !queryCollection([row], { where: args.where }, store).length,
      );
      store[collectionKey] = remaining as never;
      return { count: before - remaining.length };
    },
  };
}

/** Prisma em memória para testes e2e (sem conexão real com PostgreSQL). */
@Injectable()
export class E2ePrismaService {
  user = createDelegate('users');
  role = createDelegate('roles');
  module = createDelegate('modules');
  rolePermission = createDelegate('rolePermissions');
  organization = createDelegate('organizations');
  member = createDelegate('members');
  tag = createDelegate('tags');
  category = createDelegate('categories');
  banner = createDelegate('banners');
  socialHighlight = createDelegate('socialHighlights');
  material = createDelegate('materials');
  materialFile = createDelegate('materialFiles');
  categoryRoleAccess = createDelegate('categoryRoleAccesses');
  calendarEventType = createDelegate('calendarEventTypes');
  calendarEvent = createDelegate('calendarEvents');
  calendarEventMaterial = createDelegate('calendarEventMaterials');
  passwordResetToken = createDelegate('passwordResetTokens');
  log = createDelegate('logs');
  tagSearch = createDelegate('tagSearches');

  async $queryRaw() {
    return [{ '?column?': 1 }];
  }

  async $queryRawUnsafe(
    query: string,
    organizationId: string,
    limit?: number,
    offset?: number,
  ) {
    if (!query.includes('FROM tag_searches ts')) {
      return [];
    }

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const rows = getE2eStore().tagSearches.filter((row) => {
      const createdAt = row.createdAt;
      return (
        row.organizationId === organizationId &&
        createdAt instanceof Date &&
        createdAt.getTime() >= cutoff
      );
    });
    const grouped = new Map<
      string,
      {
        search: string;
        tags: Set<string>;
        quantity: bigint;
        createdAt: Date;
      }
    >();

    for (const row of rows) {
      const key = String(row.term);
      const createdAt = row.createdAt as Date;
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          search: String(row.search),
          tags: new Set([String(row.tagName)]),
          quantity: BigInt(1),
          createdAt,
        });
        continue;
      }

      current.quantity += BigInt(1);
      current.tags.add(String(row.tagName));
      if (createdAt > current.createdAt) {
        current.search = String(row.search);
        current.createdAt = createdAt;
      }
    }

    if (query.includes('SELECT COUNT(*)::bigint AS total')) {
      return [{ total: BigInt(grouped.size) }];
    }

    return [...grouped.values()]
      .sort((a, b) => {
        const quantityOrder = Number(b.quantity - a.quantity);
        return quantityOrder || a.search.localeCompare(b.search);
      })
      .slice(offset ?? 0, (offset ?? 0) + (limit ?? grouped.size))
      .map(({ search, tags, quantity }) => ({
        search,
        tag: [...tags].sort((a, b) => a.localeCompare(b)).join(', '),
        quantity,
      }));
  }

  async $connect() {
    return undefined;
  }

  async $disconnect() {
    return undefined;
  }

  async $transaction<T>(fn: (tx: E2ePrismaService) => Promise<T>): Promise<T> {
    return fn(this);
  }

  static resetStore() {
    resetE2eStore();
  }
}

export const PrismaService = E2ePrismaService;

@Global()
@Module({
  providers: [E2ePrismaService],
  exports: [E2ePrismaService],
})
export class PrismaModule {}
