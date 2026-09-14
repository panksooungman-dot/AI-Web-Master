import { createAsyncJobHelpers, type AsyncJobRecord } from "./asyncJob";

/** app/api/design/prototype/jobs 3종 라우트가 쓰는 Job 헬퍼. lib/design/asyncJob.ts 참고. */
export interface PrototypeJobInput {
  wireframeId: string;
}

export type PrototypeJobRecord = AsyncJobRecord<PrototypeJobInput>;

const { create, get, updateStatus } = createAsyncJobHelpers<PrototypeJobInput>(
  "design-prototype-jobs",
  "prototype-job"
);

export const createPrototypeJob = create;
export const getPrototypeJob = get;
export const updatePrototypeJobStatus = updateStatus;
