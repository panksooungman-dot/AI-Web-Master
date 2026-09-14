import { createAsyncJobHelpers, type AsyncJobRecord } from "./asyncJob";

/** app/api/design/wireframe/jobs 3종 라우트가 쓰는 Job 헬퍼. lib/design/asyncJob.ts 참고. */
export interface WireframeJobInput {
  storyboardId: string;
}

export type WireframeJobRecord = AsyncJobRecord<WireframeJobInput>;

const { create, get, updateStatus } = createAsyncJobHelpers<WireframeJobInput>(
  "design-wireframe-jobs",
  "wireframe-job"
);

export const createWireframeJob = create;
export const getWireframeJob = get;
export const updateWireframeJobStatus = updateStatus;
