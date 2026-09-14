import { createAsyncJobHelpers, type AsyncJobRecord } from "./asyncJob";

/** app/api/design/storyboard/jobs 3종 라우트가 쓰는 Job 헬퍼. lib/design/asyncJob.ts 참고. */
export interface StoryboardJobInput {
  planId: string;
}

export type StoryboardJobRecord = AsyncJobRecord<StoryboardJobInput>;

const { create, get, updateStatus } = createAsyncJobHelpers<StoryboardJobInput>(
  "design-storyboard-jobs",
  "storyboard-job"
);

export const createStoryboardJob = create;
export const getStoryboardJob = get;
export const updateStoryboardJobStatus = updateStatus;
