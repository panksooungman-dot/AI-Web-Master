import { createAsyncJobHelpers, type AsyncJobRecord } from "./asyncJob";

/** app/api/design/claude/jobs 3종 라우트가 쓰는 Job 헬퍼. lib/design/asyncJob.ts 참고. */
export interface ClaudeDesignJobInput {
  prototypeId: string;
}

export type ClaudeDesignJobRecord = AsyncJobRecord<ClaudeDesignJobInput>;

const { create, get, updateStatus } = createAsyncJobHelpers<ClaudeDesignJobInput>(
  "design-claude-jobs",
  "claude-design-job"
);

export const createClaudeDesignJob = create;
export const getClaudeDesignJob = get;
export const updateClaudeDesignJobStatus = updateStatus;
