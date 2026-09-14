import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * lib/design/generationJob.ts(Design Plan 전용, Phase 1)가 "요청 즉시 응답 → 별도 실행 → 폴링"
 * 구조로 해결한 것과 완전히 동일한 문제가 Storyboard/Wireframe/Prototype/Claude Design(Phase
 * 2~5)에도 그대로 있었다 — 전부 AI 생성이 최대 270초 가까이 걸릴 수 있는 단일 동기 POST
 * 요청이라, 실사용(2026-09-14, Storyboard 생성 중 "Generating..."에서 멈춤)에서 동일한 증상이
 * 재현됨을 확인했다. 이제 4개 Phase가 똑같은 Job 골격(id/input/status/resultId/error/
 * timestamps)을 반복하게 되어, 이 시점부터는 Rule of Two를 넘어 공용 팩토리로 추출하는 것이
 * 맞다고 판단해 분리했다. Design Plan(Phase 1)의 기존 generationJob.ts는 이미 배포·검증된
 * 코드라 이번 변경 범위에서 손대지 않는다(동작 동일, 리팩터링 목적의 위험 부담 대비 이득이
 * 없음) — 새로 만드는 4개 Phase만 이 팩토리를 쓴다.
 *
 * lib/clients/registry.ts의 createClient() 이후 확립된 원칙대로 setDoc()으로 이 Job 한 건만
 * upsert한다 — list()+push()+replaceAll()이 아니므로 동시에 여러 Job이 생성돼도 서로를
 * 지우지 않는다.
 */
export type AsyncJobStatus = "Queued" | "Running" | "Success" | "Failed";

export interface AsyncJobRecord<TInput> {
  id: string;
  input: TInput;
  status: AsyncJobStatus;
  /** Success 상태일 때만 채워지는, 실제 생성된 결과 레코드의 id. */
  resultId: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AsyncJobStatusPatch {
  resultId?: string | null;
  error?: string | null;
}

export interface AsyncJobHelpers<TInput> {
  create(input: TInput, store?: CollectionStore): Promise<AsyncJobRecord<TInput>>;
  get(id: string, store?: CollectionStore): Promise<AsyncJobRecord<TInput> | undefined>;
  updateStatus(
    id: string,
    status: AsyncJobStatus,
    patch?: AsyncJobStatusPatch,
    store?: CollectionStore
  ): Promise<AsyncJobRecord<TInput> | undefined>;
}

/** `collection`은 fs/Supabase 저장 컬렉션 이름, `idPrefix`는 generateId()에 넘길 접두사다. */
export function createAsyncJobHelpers<TInput>(collection: string, idPrefix: string): AsyncJobHelpers<TInput> {
  return {
    async create(input, store = getDefaultStore()) {
      const record: AsyncJobRecord<TInput> = {
        id: generateId(idPrefix),
        input,
        status: "Queued",
        resultId: null,
        error: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
      };

      await store.setDoc(collection, record.id, record);
      return record;
    },

    async get(id, store = getDefaultStore()) {
      const record = await store.getDoc<AsyncJobRecord<TInput>>(collection, id);
      return record ?? undefined;
    },

    async updateStatus(id, status, patch = {}, store = getDefaultStore()) {
      const current = await store.getDoc<AsyncJobRecord<TInput>>(collection, id);
      if (!current) return undefined;

      const now = new Date().toISOString();
      const updated: AsyncJobRecord<TInput> = {
        ...current,
        ...patch,
        status,
        startedAt: status === "Running" ? now : current.startedAt,
        finishedAt: status === "Success" || status === "Failed" ? now : current.finishedAt,
      };

      await store.setDoc(collection, id, updated);
      return updated;
    },
  };
}
