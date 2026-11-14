import fs from "node:fs/promises";
import path from "node:path";
import type { ConfigRecord, ContractStore, LoginAttempt, SettingsRecord, SubmissionRecord } from "./store";

/**
 * 파일/메모리 저장소 (개발·테스트용). 전체 데이터를 JSON 하나로 보관하고,
 * 모든 읽기-수정-쓰기를 한 줄로 직렬화해서 동시 요청에도 서로 덮어쓰지 않게 한다.
 * 운영(서버리스)에서는 디스크가 영구 저장되지 않으므로 쓰지 않는다(store 선택 로직 참고).
 */

export interface DbShape {
  configs: Record<string, ConfigRecord>;
  settings: SettingsRecord | null;
  submissions: Record<string, SubmissionRecord>;
  attempts: Record<string, LoginAttempt>;
}

export const emptyDb = (): DbShape => ({ configs: {}, settings: null, submissions: {}, attempts: {} });

export interface Backend {
  read(): Promise<DbShape>;
  write(db: DbShape): Promise<void>;
}

export function memoryBackend(): Backend {
  let db = emptyDb();
  return {
    read: async () => structuredClone(db),
    write: async (next) => {
      db = structuredClone(next);
    },
  };
}

export function fileBackend(file: string): Backend {
  return {
    async read() {
      try {
        const raw = await fs.readFile(file, "utf-8");
        return { ...emptyDb(), ...JSON.parse(raw) } as DbShape;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
        throw e;
      }
    },
    async write(db) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      // 임시 파일에 쓴 뒤 교체해서, 쓰는 도중 중단돼도 기존 파일이 깨지지 않게 한다.
      const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2), { encoding: "utf-8", mode: 0o600 });
      await fs.rename(tmp, file);
    },
  };
}

export function createStore(backend: Backend): ContractStore {
  let chain: Promise<unknown> = Promise.resolve();
  /** 읽기-수정-쓰기를 한 줄로 실행한다. 이전 작업이 실패해도 다음 작업은 계속 진행한다. */
  const mutate = <T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const db = await backend.read();
      const before = JSON.stringify(db);
      const result = await fn(db);
      if (JSON.stringify(db) !== before) await backend.write(db);
      return result;
    });
    chain = run.catch(() => undefined);
    return run;
  };
  const read = <T>(fn: (db: DbShape) => T): Promise<T> => mutate((db) => fn(db));

  return {
    listConfigs: () => read((db) => Object.values(db.configs).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    getConfig: (token) => read((db) => db.configs[token] ?? null),
    putConfig: (rec) => mutate((db) => void (db.configs[rec.token] = rec)),
    deleteConfig: (token) =>
      mutate((db) => {
        if (!db.configs[token]) return false;
        delete db.configs[token];
        return true;
      }),

    getSettings: () => read((db) => db.settings),
    putSettings: (rec) => mutate((db) => void (db.settings = rec)),

    listSubmissions: () => read((db) => Object.values(db.submissions).sort((a, b) => b.signedAt.localeCompare(a.signedAt))),
    getSubmission: (id) => read((db) => db.submissions[id] ?? null),
    getSubmissionByToken: (token) => read((db) => Object.values(db.submissions).find((s) => s.configToken === token) ?? null),
    insertSubmission: (rec) =>
      mutate((db) => {
        if (Object.values(db.submissions).some((s) => s.configToken === rec.configToken)) return false;
        db.submissions[rec.id] = rec;
        return true;
      }),
    updateSubmission: (id, patch) =>
      mutate((db) => {
        const cur = db.submissions[id];
        if (!cur) return null;
        db.submissions[id] = { ...cur, ...patch, id: cur.id, configToken: cur.configToken };
        return db.submissions[id];
      }),
    deleteSubmission: (id) =>
      mutate((db) => {
        if (!db.submissions[id]) return false;
        delete db.submissions[id];
        return true;
      }),

    getAttempt: (key) => read((db) => db.attempts[key] ?? null),
    putAttempt: (a) => mutate((db) => void (db.attempts[a.key] = a)),
    clearAttempt: (key) => mutate((db) => void delete db.attempts[key]),
  };
}

export const createMemoryStore = (): ContractStore => createStore(memoryBackend());
export const createFileStore = (dir: string): ContractStore => createStore(fileBackend(path.join(dir, "contract-db.json")));
