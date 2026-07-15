import fs from "fs";
import path from "path";
import type { CollectionStore } from "./collectionStore";

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

/**
 * Filesystem implementation — the exact fs logic every registry used to have inline (read the
 * whole file, JSON.parse, write the whole file back), extracted behind `CollectionStore` so it
 * can be swapped for `supabaseStore` without touching any registry's business logic. Used for
 * local `next dev`/`next start` when Supabase env vars aren't configured, so local development
 * needs no setup. A given collection name is either array-shaped (`list`/`replaceAll`, one JSON
 * array per file) or doc-shaped (`getDoc`/`setDoc`, one `{ [id]: value }` JSON object per file,
 * e.g. metrics' "counters" doc) — never both, matching how every registry actually calls this.
 */
export function createFsStore(baseDir: string = DEFAULT_BASE_DIR): CollectionStore {
  function filePath(collection: string): string {
    return path.join(baseDir, `${collection}.json`);
  }

  function ensureFile(collection: string, empty: string): void {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    const file = filePath(collection);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, empty, "utf-8");
    }
  }

  return {
    async list<T extends { id: string }>(collection: string): Promise<T[]> {
      ensureFile(collection, "[]");
      try {
        const raw = fs.readFileSync(filePath(collection), "utf-8");
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    },

    async replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void> {
      ensureFile(collection, "[]");
      fs.writeFileSync(filePath(collection), JSON.stringify(records, null, 2), "utf-8");
    },

    async getDoc<T>(collection: string, id: string): Promise<T | null> {
      ensureFile(collection, "{}");
      try {
        const raw = fs.readFileSync(filePath(collection), "utf-8");
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const value = (parsed as Record<string, unknown>)[id];
        return value === undefined ? null : (value as T);
      } catch {
        return null;
      }
    },

    async setDoc<T>(collection: string, id: string, doc: T): Promise<void> {
      ensureFile(collection, "{}");
      let map: Record<string, unknown> = {};
      try {
        const raw = fs.readFileSync(filePath(collection), "utf-8");
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          map = parsed as Record<string, unknown>;
        }
      } catch {
        // start fresh on parse failure
      }
      map[id] = doc;
      fs.writeFileSync(filePath(collection), JSON.stringify(map, null, 2), "utf-8");
    },
  };
}
