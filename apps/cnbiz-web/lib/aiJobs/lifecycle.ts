import type { CollectionStore } from "@/lib/db/collectionStore";

/**
 * AI Business OS 공식 Lifecycle Extension Point.
 *
 * Customer Inquiry Pipeline Version 1(processJob()·executeJob()·triggerDeployment()·
 * triggerWorkspaceProvisioning()·Deployment Pipeline·GitHub/Vercel Client)은 공식 완료되어
 * 더 이상 수정하지 않는다. 새 운영 기능(고객 URL 전달·Slack·Discord·CRM·Billing·QA·
 * 자동 재배포 등)을 그 이후에도 계속 추가할 수 있도록, `processJob()`은 이 모듈의
 * `runPostProcessHooks()`를 "성공 경로의 마지막 단계"로 단 한 번만 호출한다.
 *
 * 이 파일은 어떤 구체적 기능도 알지 못하는 순수 실행기다 — Customer/Slack/CRM 등 어떤
 * 이름도 이 파일에는 등장하지 않는다. "무엇이 등록되어 있는지"는 전적으로
 * `lib/aiJobs/hooks/index.ts`(Hook Registry)의 책임이다.
 */

export interface PostProcessContext {
  jobId: string;
  store?: CollectionStore;
}

export type PostProcessHookRun = (context: PostProcessContext) => Promise<void>;

export interface PostProcessHookRegistration {
  /** 로그·디버깅용 고유 식별자. 동일한 name으로 다시 등록하면 기존 등록을 교체한다
   *  (Hot Reload로 등록 모듈이 재실행되어도 중복 누적되지 않도록 함). */
  name: string;
  /** 오름차순으로 실행된다. 생략 시 100. */
  priority?: number;
  run: PostProcessHookRun;
}

interface RegisteredHook {
  name: string;
  priority: number;
  run: PostProcessHookRun;
}

const DEFAULT_PRIORITY = 100;

const hooks: RegisteredHook[] = [];

export function registerPostProcessHook(registration: PostProcessHookRegistration): void {
  const entry: RegisteredHook = {
    name: registration.name,
    priority: registration.priority ?? DEFAULT_PRIORITY,
    run: registration.run,
  };

  const existingIndex = hooks.findIndex((hook) => hook.name === entry.name);
  if (existingIndex === -1) {
    hooks.push(entry);
  } else {
    hooks[existingIndex] = entry;
  }
}

/**
 * 등록된 Hook을 priority 오름차순으로, 각각 독립적으로 실행한다. 한 Hook이 실패해도
 * 다음 Hook이나 processJob()의 성공 상태에 영향을 주지 않는다 — 실패 원인은 각 Hook
 * 자신의 로깅/Audit Log 책임이며, 이 실행기는 콘솔 로그만 남긴다.
 */
export async function runPostProcessHooks(context: PostProcessContext): Promise<void> {
  const ordered = [...hooks].sort((a, b) => a.priority - b.priority);

  for (const hook of ordered) {
    await hook.run(context).catch((error) => {
      console.error(`Post-process hook "${hook.name}" failed for AI Job ${context.jobId}`, error);
    });
  }
}

/** 테스트 전용 — 테스트 간 등록 목록 오염을 막기 위한 초기화. */
export function __resetPostProcessHooksForTests(): void {
  hooks.length = 0;
}
