import fs from "fs";
import os from "os";
import path from "path";
import type { CollectionStore } from "./collectionStore";
import { createLockTable } from "./collectionLock";

/**
 * getDefaultStore()의 fail-fast 가드(lib/db/index.ts) 덕분에 Production에서는 이 store가
 * 선택되는 일이 없어야 정상이다 — 이건 로컬 개발/테스트 전용 폴백이므로, 배포 산출물의
 * 읽기 전용 경로(process.cwd(), 모노레포 빌드 시 예: /var/task/apps/cnbiz-web)가 아니라
 * OS가 실제로 쓰기를 보장하는 임시 디렉터리(os.tmpdir())를 사용한다.
 */
const DEFAULT_BASE_DIR = path.join(os.tmpdir(), "cnbiz-web", "data");

interface FileEntry {
  id: string;
  data: unknown;
}

/**
 * 동시 쓰기 경합(Release Readiness Audit — Major #3) 방지 락은 lib/db/collectionLock.ts로
 * 공용 추출되어 supabaseStore.ts와 공유한다 — 두 store 모두 정확히 같은 read-modify-write
 * 패턴(list→push/filter→replaceAll)을 쓰기 때문.
 *
 * 파일 하나(`<collection>.json`)는 항상 `{id, data}[]` 배열이다 — supabaseStore.ts가 쓰는
 * `app_collections` 테이블(collection/id/data 컬럼)과 같은 모양으로 맞춰, list/replaceAll과
 * getDoc/setDoc이 같은 collection 이름을 섞어 써도 항상 같은 데이터를 본다(2026-09-13 이전에는
 * list/replaceAll은 `T[]`를, getDoc/setDoc은 `{id: T}` 맵을 각각 다른 파일 포맷으로 저장해,
 * 예를 들어 setDoc으로 만든 레코드를 list가 전혀 보지 못하는 문제가 있었다).
 */
export function createFsStore(baseDir: string = DEFAULT_BASE_DIR): CollectionStore {
  const { acquire, acquireForWrite, armAutoRelease, release } = createLockTable();

  function filePath(collection: string): string {
    return path.join(baseDir, `${collection}.json`);
  }

  function ensureFile(collection: string): void {
    if (!fs.existsSync(baseDir)) {
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch (error) {
        throw new Error(
          `[fsStore] "${baseDir}" 디렉터리를 생성할 수 없습니다: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const file = filePath(collection);

    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf-8");
    }
  }

  function readEntries(collection: string): FileEntry[] {
    ensureFile(collection);
    try {
      const raw = fs.readFileSync(filePath(collection), "utf-8");
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as FileEntry[]) : [];
    } catch {
      return [];
    }
  }

  function writeEntries(collection: string, entries: FileEntry[]): void {
    ensureFile(collection);
    fs.writeFileSync(filePath(collection), JSON.stringify(entries, null, 2), "utf-8");
  }

  return {
    async list<T extends { id: string }>(collection: string): Promise<T[]> {
      await acquire(collection);
      try {
        return readEntries(collection).map((entry) => entry.data as T);
      } finally {
        armAutoRelease(collection);
      }
    },

    async replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void> {
      await acquireForWrite(collection);
      try {
        writeEntries(
          collection,
          records.map((record) => ({ id: record.id, data: record }))
        );
      } finally {
        release(collection);
      }
    },

    async getDoc<T>(collection: string, id: string): Promise<T | null> {
      await acquire(collection);
      try {
        const match = readEntries(collection).find((entry) => entry.id === id);
        return match === undefined ? null : (match.data as T);
      } finally {
        armAutoRelease(collection);
      }
    },

    async setDoc<T>(collection: string, id: string, doc: T): Promise<void> {
      await acquireForWrite(collection);
      try {
        const entries = readEntries(collection);
        const index = entries.findIndex((entry) => entry.id === id);
        const stored: FileEntry = { id, data: doc };
        if (index === -1) entries.push(stored);
        else entries[index] = stored;
        writeEntries(collection, entries);
      } finally {
        release(collection);
      }
    },
  };
}
