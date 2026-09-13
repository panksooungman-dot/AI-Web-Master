import type { CollectionStore } from "./collectionStore";

interface Entry {
  id: string;
  data: unknown;
}

/**
 * In-memory implementation, used by tests. Each test creates its own instance
 * (`createMemoryStore()`) the same way tests used to create their own temp `baseDir` — same
 * per-test isolation guarantee, no filesystem or network involved.
 *
 * Stores each collection as an `{id, data}[]` array — the same shape fsStore.ts's files and
 * supabaseStore.ts's `app_collections` table use — so list/replaceAll and getDoc/setDoc always
 * see the same data even when mixed on the same collection name (2026-09-13).
 */
export function createMemoryStore(): CollectionStore {
  const collections = new Map<string, Entry[]>();

  return {
    async list<T extends { id: string }>(collection: string): Promise<T[]> {
      return (collections.get(collection) ?? []).map((entry) => entry.data as T);
    },

    async replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void> {
      collections.set(
        collection,
        records.map((record) => ({ id: record.id, data: record }))
      );
    },

    async getDoc<T>(collection: string, id: string): Promise<T | null> {
      const match = (collections.get(collection) ?? []).find((entry) => entry.id === id);
      return match === undefined ? null : (match.data as T);
    },

    async setDoc<T>(collection: string, id: string, doc: T): Promise<void> {
      const entries = [...(collections.get(collection) ?? [])];
      const index = entries.findIndex((entry) => entry.id === id);
      const stored: Entry = { id, data: doc };
      if (index === -1) entries.push(stored);
      else entries[index] = stored;
      collections.set(collection, entries);
    },
  };
}
