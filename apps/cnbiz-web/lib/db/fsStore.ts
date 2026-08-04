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

/**
 * Release Readiness Audit — Major #3. 모든 registry는 "list()로 전체를 읽는다 → JS에서
 * find/push/filter로 수정한다 → replaceAll()로 통째로 다시 쓴다"는 동일한 read-modify-write
 * 패턴을 쓴다(getDoc()/setDoc()도 동일 패턴). list()와 replaceAll()이 서로 아무 연관 없는
 * 두 번의 독립 호출이라, 두 요청이 동시에 들어오면 A가 읽고 → B가 읽고(A가 아직 안 씀,
 * B는 A의 변경을 못 봄) → A가 쓰고 → B가 A의 결과를 덮어쓰며 A의 변경을 통째로 유실시킬 수
 * 있다 — Promise.all()로 여러 registry 호출을 동시에 시작하면 실제로 재현된다(자바스크립트는
 * 각 async 함수가 첫 await까지 동기 실행되므로, 서로 다른 여러 호출의 "읽기" 구간이 그 중
 * 누구의 "쓰기"보다도 먼저 전부 끝나버릴 수 있음).
 *
 * 아래는 새 Store·새 라이브러리(Mutex/Queue 패키지) 없이, 이 파일 안에서만 collection 단위로
 * 접근을 직렬화하는 순수 Promise 락이다. list()/getDoc()는 읽은 뒤 곧바로 잠금을 자동
 * 해제하도록 예약해두고(별도 write 없이 끝나는 순수 조회 호출이 잠금을 영원히 붙들지 않도록),
 * 바로 뒤이어 같은 collection에 replaceAll()/setDoc()가 호출되면(이 저장소의 모든 registry가
 * list()/getDoc() 직후 다른 비동기 I/O 없이 순수 JS 연산만 거쳐 즉시 replaceAll()/setDoc()를
 * 부르는 것과 정확히 같은 모양) 그 예약을 취소하고 잠금을 그대로 이어받아 쓰기까지 마친 뒤에만
 * 해제한다. `setImmediate`(매크로태스크)로 예약하는 이유: read→write 사이의 순수 JS 연산과
 * `await`들은 전부 마이크로태스크로 처리되어 항상 다음 매크로태스크보다 먼저 끝나므로, 실제
 * write가 뒤따르는 경우 자동 해제 타이머가 발동하기 전에 반드시 취소된다(`queueMicrotask`를
 * 쓰면 그 반대로, 호출자가 재개하기도 전에 먼저 발동해버려 오히려 잘못된다).
 *
 * `createFsStore()`(즉 baseDir)별 클로저 안에 있어, 서로 다른 baseDir(예: 격리된 테스트마다
 * 생성하는 임시 디렉터리)끼리는 잠금이 절대 섞이지 않는다.
 */
interface CollectionLock {
  locked: boolean;
  queue: Array<() => void>;
  releaseTimer: NodeJS.Immediate | null;
}

function createLockTable() {
  const locks = new Map<string, CollectionLock>();

  function getLock(collection: string): CollectionLock {
    let lock = locks.get(collection);
    if (!lock) {
      lock = { locked: false, queue: [], releaseTimer: null };
      locks.set(collection, lock);
    }
    return lock;
  }

  function release(collection: string): void {
    const lock = getLock(collection);
    if (lock.releaseTimer) {
      clearImmediate(lock.releaseTimer);
      lock.releaseTimer = null;
    }
    const next = lock.queue.shift();
    if (next) {
      next(); // 잠금을 넘겨준다 — locked는 계속 true
    } else {
      lock.locked = false;
    }
  }

  /** 자기 차례가 되면 resolve된다. 다 쓰면 release(collection) 또는 armAutoRelease()를 호출해야 한다. */
  function acquire(collection: string): Promise<void> {
    const lock = getLock(collection);
    if (!lock.locked) {
      lock.locked = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      lock.queue.push(resolve);
    });
  }

  /**
   * 방금 list()/getDoc()가 자동 해제를 예약해둔 잠금이 아직 살아있으면(= 같은 호출 체인이
   * 곧바로 이어서 쓰는 read-modify-write 상황) 그 예약만 취소하고 잠금을 그대로 이어받는다.
   * 그렇지 않으면(선행 read 없이 바로 쓰는 호출 등) 보통 acquire()처럼 줄을 선다.
   */
  async function acquireForWrite(collection: string): Promise<void> {
    const lock = getLock(collection);
    if (lock.locked && lock.releaseTimer) {
      clearImmediate(lock.releaseTimer);
      lock.releaseTimer = null;
      return;
    }
    await acquire(collection);
  }

  function armAutoRelease(collection: string): void {
    const lock = getLock(collection);
    lock.releaseTimer = setImmediate(() => release(collection));
  }

  return { acquire, acquireForWrite, armAutoRelease, release };
}

export function createFsStore(baseDir: string = DEFAULT_BASE_DIR): CollectionStore {
  const { acquire, acquireForWrite, armAutoRelease, release } = createLockTable();

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
      await acquire(collection);
      try {
        ensureFile(collection, "[]");
        try {
          const raw = fs.readFileSync(filePath(collection), "utf-8");
          const parsed: unknown = JSON.parse(raw);
          return Array.isArray(parsed) ? (parsed as T[]) : [];
        } catch {
          return [];
        }
      } finally {
        armAutoRelease(collection);
      }
    },

    async replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void> {
      await acquireForWrite(collection);
      try {
        ensureFile(collection, "[]");
        fs.writeFileSync(filePath(collection), JSON.stringify(records, null, 2), "utf-8");
      } finally {
        release(collection);
      }
    },

    async getDoc<T>(collection: string, id: string): Promise<T | null> {
      await acquire(collection);
      try {
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
      } finally {
        armAutoRelease(collection);
      }
    },

    async setDoc<T>(collection: string, id: string, doc: T): Promise<void> {
      await acquireForWrite(collection);
      try {
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
      } finally {
        release(collection);
      }
    },
  };
}
