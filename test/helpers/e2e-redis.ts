type MemoryEntry = {
  value: string;
  expiresAt?: number;
};

export type E2eRedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (
    key: string,
    value: string,
    mode?: string,
    ttl?: number,
  ) => Promise<'OK'>;
  del: (key: string) => Promise<number>;
  ping: () => Promise<'PONG'>;
  quit: () => Promise<'OK'>;
  disconnect: () => void;
};

export function createE2eRedisClient(): E2eRedisClient {
  const store = new Map<string, MemoryEntry>();

  const read = (key: string): string | null => {
    const entry = store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }

    return entry.value;
  };

  return {
    async get(key: string) {
      return read(key);
    },
    async set(key: string, value: string, mode?: string, ttl?: number) {
      store.set(key, {
        value,
        expiresAt:
          mode === 'EX' && typeof ttl === 'number'
            ? Date.now() + ttl * 1000
            : undefined,
      });
      return 'OK';
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
    async ping() {
      return 'PONG';
    },
    async quit() {
      store.clear();
      return 'OK';
    },
    disconnect() {
      store.clear();
    },
  };
}
