import { Global, Injectable, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      return throwIfNotFound(await createDelegate(collectionKey).findFirst(args));
    },
    findUniqueOrThrow: async (args: QueryArgs = {}) => {
      return throwIfNotFound(await createDelegate(collectionKey).findUnique(args));
    },
    count: async (args: QueryArgs = {}) => {
      const rows = await createDelegate(collectionKey).findMany(args);
      return rows.length;
    },
    create: async (args: { data: Record<string, unknown>; select?: Record<string, unknown> }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      const row = mergeCreateData(args.data, store);
      collection.push(row);
      return findFirst(collection, { where: { id: row.id }, select: args.select }, store) ?? row;
    },
    createMany: async (args: { data: Record<string, unknown>[] }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      for (const item of args.data) {
        collection.push(mergeCreateData(item, store));
      }
      return { count: args.data.length };
    },
    update: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      const row = findUnique(collection, { where: args.where }, store);
      if (!row) {
        throw new Error(`${String(collectionKey)} not found`);
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
    updateMany: async (args: { where?: Record<string, unknown>; data: Record<string, unknown> }) => {
      const store = getE2eStore();
      const collection = store[collectionKey] as Record<string, unknown>[];
      let count = 0;
      for (const row of collection) {
        if (args.where && !queryCollection([row], { where: args.where }, store).length) {
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
      const index = collection.findIndex((row) =>
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
  material = createDelegate('materials');
  materialFile = createDelegate('materialFiles');
  categoryRoleAccess = createDelegate('categoryRoleAccesses');
  passwordResetToken = createDelegate('passwordResetTokens');
  log = createDelegate('logs');
  tagSearch = createDelegate('tagSearches');

  async $queryRaw() {
    return [{ '?column?': 1 }];
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
