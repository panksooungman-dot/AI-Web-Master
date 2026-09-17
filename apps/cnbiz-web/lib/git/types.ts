import type { FetchLike } from "@/lib/github/types";

export type { FetchLike };

export interface GitStepResult {
  success: boolean;
  error?: string;
  /** commitAll() 성공 시 생성된 commit SHA. pushToRemote()가 이 값으로 branch ref를 옮긴다. */
  stdout?: string;
}

/** commitAll()/pushToRemote()가 GitHub Git Data API를 호출할 대상 저장소. */
export interface GitTargetRepo {
  owner: string;
  name: string;
}
