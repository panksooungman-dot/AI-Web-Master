import { createAsyncJobHelpers, type AsyncJobRecord } from "./asyncJob";

/**
 * app/api/design/website/jobs 3종 라우트가 쓰는 Job 헬퍼. lib/design/asyncJob.ts·
 * lib/design/storyboardJob.ts와 동일한 패턴.
 *
 * 2026-09-18 실사용 — 기존 동기 POST /api/design/website(app/api/design/website/route.ts)가
 * "AI로 여러 페이지 콘텐츠 생성 + GitHub 저장소 생성 + 커밋/푸시 + Vercel 프로젝트 생성·배포"를
 * 전부 한 요청 안에서 끝까지 처리하는데, 페이지가 많은 실제 프로젝트(사색찬미한정식)에서 이
 * 전체 과정이 maxDuration(300초, 현재 요금제 상한)을 그대로 넘겨버려 매번 정확히 5분 뒤
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input" + History 기록
 * 안 됨으로 재현됨을 실사용 중 확인. Storyboard/Wireframe/Prototype/Claude Design(Phase 2~5)이
 * 이미 동일한 문제를 "요청 즉시 응답 → 별도 실행(run) → 폴링" 구조로 해결한 전례를 그대로 따른다.
 * 기존 동기 라우트는 계약을 바꾸지 않고 그대로 둔다(다른 소비처가 생기더라도 영향 없음).
 */
export interface WebsiteBuildJobInput {
  reviewId: string;
  outDir?: string;
}

export type WebsiteBuildJobRecord = AsyncJobRecord<WebsiteBuildJobInput>;

const { create, get, updateStatus } = createAsyncJobHelpers<WebsiteBuildJobInput>(
  "design-website-build-jobs",
  "website-build-job"
);

export const createWebsiteBuildJob = create;
export const getWebsiteBuildJob = get;
export const updateWebsiteBuildJobStatus = updateStatus;
