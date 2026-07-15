import type { CollectionStore } from "./collectionStore";

/**
 * In-memory implementation, used by tests. Each test creates its own instance
 * (`createMemoryStore()`) the same way tests used to create their own temp `baseDir` — same
 * per-test isolation guarantee, no filesystem or network involved.
 */
export function createMemoryStore(): CollectionStore {
  const collections = new Map<string, unknown[]>();
  const docs = new Map<string, unknown>();

  return {
    async list<T extends { id: string }>(collection: string): Promise<T[]> {
      return [...(collections.get(collection) ?? [])] as T[];
    },

    async replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void> {
      collections.set(collection, [...records]);
    },

    async getDoc<T>(collection: string, id: string): Promise<T | null> {
      const doc = docs.get(`${collection}/${id}`);
      return doc === undefined ? null : (doc as T);
    },

    async setDoc<T>(collection: string, id: string, doc: T): Promise<void> {
      docs.set(`${collection}/${id}`, doc);
    },
  };
}
