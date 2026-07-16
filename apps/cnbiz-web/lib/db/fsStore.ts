import fs from "fs";
import os from "os";
import path from "path";
import type { CollectionStore } from "./collectionStore";

/**
 * getDefaultStore()의 fail-fast 가드(lib/db/index.ts) 덕분에 Production에서는 이 store가
 * 선택되는 일이 없어야 정상이다 — 이건 로컬 개발/테스트 전용 폴백이므로, 배포 산출물의
 * 읽기 전용 경로(process.cwd(), 모노레포 빌드 시 예: /var/task/apps/cnbiz-web)가 아니라
 * OS가 실제로 쓰기를 보장하는 임시 디렉터리(os.tmpdir())를 사용한다.
 */
const DEFAULT_BASE_DIR = path.join(os.tmpdir(), "cnbiz-web", "data");

export function createFsStore(baseDir: string = DEFAULT_BASE_DIR): CollectionStore {
  function filePath(collection: string): string {
    return path.join(baseDir, `${collection}.json`);
  }

  function ensureFile(collection: string, empty: string): void {
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
        // JSON 파싱 실패 시 새로 시작
      }

      map[id] = doc;
      fs.writeFileSync(filePath(collection), JSON.stringify(map, null, 2), "utf-8");
    },
  };
}
