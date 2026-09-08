export type JobStatus =
  | "queued"
  | "analyzing"
  | "rendering"
  | "revising"
  | "done"
  | "error";

export interface JobLogLine {
  at: string;
  text: string;
}

export interface JobRecord {
  id: string;
  originalFilename: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  /** 원본 영상 파일 경로 (서버 디스크) */
  sourcePath: string;
  /** analyze 단계 산출물 */
  edlPath?: string;
  reviewPath?: string;
  reviewText?: string;
  /** 최종 완성 영상 경로 */
  finalPath?: string;
  /** 지금까지 적용된 수정 지시 이력 */
  revisions: { instruction: string; appliedAt: string; summary: string }[];
  error?: string;
  logs: JobLogLine[];
}
