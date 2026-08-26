/**
 * Release Readiness Audit — Major #3. 모든 registry는 "list()로 전체를 읽는다 → JS에서
 * find/push/filter로 수정한다 → replaceAll()로 통째로 다시 쓴다"는 동일한 read-modify-write
 * 패턴을 쓴다(getDoc()/setDoc()도 동일 패턴). list()와 replaceAll()이 서로 아무 연관 없는
 * 두 번의 독립 호출이라, 두 요청이 동시에 들어오면 A가 읽고 → B가 읽고(A가 아직 안 씀,
 * B는 A의 변경을 못 봄) → A가 쓰고 → B가 A의 결과를 덮어쓰며 A의 변경을 통째로 유실시킬 수
 * 있다 — Promise.all()로 여러 registry 호출을 동시에 시작하면 실제로 재현된다(자바스크립트는
 * 각 async 함수가 첫 await까지 동기 실행되므로, 서로 다른 여러 호출의 "읽기" 구간이 그 중
 * 누구의 "쓰기"보다도 먼저 전부 끝나버릴 수 있음). Supabase 저장소(supabaseStore.ts)의
 * replaceAll()은 "내가 읽은 목록에 없는 행은 삭제"하는 방식이라 이 경합이 특히 위험하다 —
 * 늦게 완료되는 호출이 그보다 먼저 쓴 다른 호출의 행을 오래된 스냅샷 기준으로 삭제해버릴 수
 * 있다(실사용에서 실제로 재현됨: lib/inquiries/notify.ts가 Promise.all()로 email/Slack/SOLAPI
 * 3개 채널의 recordAuditEvent()를 동시에 호출할 때, 네트워크 요청이 있어 더 늦게 끝나는 채널의
 * Audit Log 기록이 먼저 끝난 채널의 replaceAll()에 의해 지워짐).
 *
 * 아래는 새 Store·새 라이브러리(Mutex/Queue 패키지) 없이, collection 단위로 접근을 직렬화하는
 * 순수 Promise 락이다. list()/getDoc()는 읽은 뒤 곧바로 잠금을 자동 해제하도록 예약해두고(별도
 * write 없이 끝나는 순수 조회 호출이 잠금을 영원히 붙들지 않도록), 바로 뒤이어 같은
 * collection에 replaceAll()/setDoc()가 호출되면(이 저장소의 모든 registry가 list()/getDoc()
 * 직후 다른 비동기 I/O 없이 순수 JS 연산만 거쳐 즉시 replaceAll()/setDoc()를 부르는 것과 정확히
 * 같은 모양) 그 예약을 취소하고 잠금을 그대로 이어받아 쓰기까지 마친 뒤에만 해제한다.
 * `setImmediate`(매크로태스크)로 예약하는 이유: read→write 사이의 순수 JS 연산과 `await`들은
 * 전부 마이크로태스크로 처리되어 항상 다음 매크로태스크보다 먼저 끝나므로, 실제 write가
 * 뒤따르는 경우 자동 해제 타이머가 발동하기 전에 반드시 취소된다(`queueMicrotask`를 쓰면 그
 * 반대로, 호출자가 재개하기도 전에 먼저 발동해버려 오히려 잘못된다).
 *
 * `createLockTable()` 호출마다 독립된 락 테이블(Map)을 반환하므로, 서로 다른 store 인스턴스
 * (예: 격리된 테스트마다 생성하는 fsStore)끼리는 잠금이 절대 섞이지 않는다. 같은 프로세스 안의
 * 동일 store 인스턴스(getDefaultStore()가 프로세스당 1회만 생성해 캐시하므로, 한 요청 안에서
 * Promise.all()로 여러 recordAuditEvent()가 동시에 호출돼도 전부 이 락 테이블을 공유)에서만
 * 의미가 있다 — 서로 다른 서버리스 인스턴스/프로세스 간의 동시 쓰기까지는 막지 못한다.
 */
interface CollectionLock {
  locked: boolean;
  queue: Array<() => void>;
  releaseTimer: NodeJS.Immediate | null;
}

export function createLockTable() {
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
