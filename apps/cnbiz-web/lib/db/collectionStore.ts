/**
 * Storage abstraction behind every registry in this app (auth, audit, metrics, projects,
 * workspaces, websites, and the Design Automation registries). Every one of these already
 * followed the same "read the whole array/object into memory, mutate in JS, write the whole
 * thing back" shape — this interface is just that shape made explicit and swappable, so the
 * actual I/O primitive (fs JSON file, in-memory Map, Supabase table) can change without
 * touching any registry's business logic.
 *
 * - `list`/`replaceAll`: the array-shaped registries (users, sessions, audit log, projects,
 *   workspaces, websites, every Design Automation registry).
 * - `getDoc`/`setDoc`: the one singleton-shaped registry (metrics counters).
 */
export interface CollectionStore {
  /** `T` must carry an `id: string` — every array-shaped registry record already does, and
   *  the Supabase implementation needs it as the row's primary key alongside `collection`. */
  list<T extends { id: string }>(collection: string): Promise<T[]>;
  replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void>;
  getDoc<T>(collection: string, id: string): Promise<T | null>;
  setDoc<T>(collection: string, id: string, doc: T): Promise<void>;
}
