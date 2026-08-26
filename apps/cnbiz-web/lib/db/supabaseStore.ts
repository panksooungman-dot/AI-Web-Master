import { createClient } from "@supabase/supabase-js";
import type { CollectionStore } from "./collectionStore";
import { createLockTable } from "./collectionLock";

/**
 * Supabase implementation, backed by the single `app_collections` table
 * (see supabase/migrations/0001_app_collections.sql). One JSON-document table backs every
 * migrated registry — `collection` is the registry name (e.g. "users", "design-plans"),
 * `id` is the record id (or a fixed id like "counters" for a singleton doc). This mirrors the
 * existing JSON shapes exactly, so registries' business logic (find/filter/map over the full
 * array) doesn't change — only the load/save I/O primitive does.
 *
 * 같은 collection에 대한 여러 "list() → 로컬에서 push/filter → replaceAll()" 호출이 동시에
 * 실행되면(예: lib/inquiries/notify.ts가 Promise.all()로 email/Slack/SOLAPI 3개 채널의
 * recordAuditEvent()를 동시에 호출하는 경우) 서로의 쓰기를 지워버릴 수 있다 —
 * replaceAll()이 "내가 읽은 목록에 없는 행은 삭제"하는 방식이라, 늦게 완료되는 호출(실제
 * 네트워크 요청이 있는 SOLAPI 등)이 그보다 먼저 쓴 다른 호출의 행을 오래된 스냅샷 기준으로
 * 지워버리는 것을 실사용(2026-08-26, SOLAPI Audit Log 기록이 매번 사라지는 현상)에서 실제로
 * 재현·확인했다. lib/db/fsStore.ts가 이미 이 문제를 collection 단위 Promise 락으로 해결하고
 * 있었는데(Release Readiness Audit — Major #3), 그 락은 fsStore 내부에만 있어 프로덕션이
 * 쓰는 이 store에는 적용돼 있지 않았다 — 같은 락 구현(lib/db/collectionLock.ts로 공용 추출)을
 * 여기에도 적용한다. getDefaultStore()가 store 인스턴스를 프로세스당 1회만 생성해 캐시하므로
 * (lib/db/index.ts), 같은 요청 안에서 Promise.all()로 여러 recordAuditEvent()가 동시에
 * 호출돼도 전부 이 락 테이블을 공유해 직렬화된다.
 */
export function createSupabaseStore(url: string, serviceRoleKey: string): CollectionStore {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { acquire, acquireForWrite, armAutoRelease, release } = createLockTable();

  return {
    async list<T extends { id: string }>(collection: string): Promise<T[]> {
      await acquire(collection);
      try {
        const { data, error } = await client
          .from("app_collections")
          .select("data")
          .eq("collection", collection);

        if (error) {
          throw new Error(`[supabaseStore] list("${collection}") failed: ${error.message}`);
        }

        return (data ?? []).map((row) => row.data as T);
      } finally {
        armAutoRelease(collection);
      }
    },

    async replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void> {
      await acquireForWrite(collection);
      try {
        // Upsert-then-delete-stale instead of delete-then-insert: writing the new/updated rows
        // first means the collection never passes through an empty state. If this call is
        // interrupted between the two steps, the worst case is a few stale rows left behind
        // (cleaned up by the next successful replaceAll) rather than the whole collection's data
        // being lost — the old delete-then-insert order lost everything on a crash in that window.
        if (records.length > 0) {
          const rows = records.map((record) => ({
            collection,
            id: record.id,
            data: record,
          }));

          const { error: upsertError } = await client
            .from("app_collections")
            .upsert(rows, { onConflict: "collection,id" });

          if (upsertError) {
            throw new Error(`[supabaseStore] replaceAll("${collection}") upsert failed: ${upsertError.message}`);
          }
        }

        let deleteQuery = client.from("app_collections").delete().eq("collection", collection);

        if (records.length > 0) {
          const keepIds = records.map((record) => `"${record.id}"`).join(",");
          deleteQuery = deleteQuery.not("id", "in", `(${keepIds})`);
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
          throw new Error(`[supabaseStore] replaceAll("${collection}") delete failed: ${deleteError.message}`);
        }
      } finally {
        release(collection);
      }
    },

    async getDoc<T>(collection: string, id: string): Promise<T | null> {
      await acquire(collection);
      try {
        const { data, error } = await client
          .from("app_collections")
          .select("data")
          .eq("collection", collection)
          .eq("id", id)
          .maybeSingle();

        if (error) {
          throw new Error(`[supabaseStore] getDoc("${collection}", "${id}") failed: ${error.message}`);
        }

        return data ? (data.data as T) : null;
      } finally {
        armAutoRelease(collection);
      }
    },

    async setDoc<T>(collection: string, id: string, doc: T): Promise<void> {
      await acquireForWrite(collection);
      try {
        const { error } = await client
          .from("app_collections")
          .upsert({ collection, id, data: doc }, { onConflict: "collection,id" });

        if (error) {
          throw new Error(`[supabaseStore] setDoc("${collection}", "${id}") failed: ${error.message}`);
        }
      } finally {
        release(collection);
      }
    },
  };
}
