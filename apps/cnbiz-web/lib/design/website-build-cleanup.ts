import type { WebsiteBuildRecord } from "./website-build";
import type { WebsiteRecord } from "@/lib/websites/registry";

/**
 * 같은 Review로 Website Build를 다시 실행하면 매번 완전히 새로운 GitHub 저장소·Vercel
 * 프로젝트가 생성된다(lib/deployment/pipeline.ts, websiteId 기반 이름). 직전 버전을 그대로
 * 두면 관리자가 어떤 링크가 최신인지 헷갈리고(2026-09-18 실사용 중 발견) 쓰지 않는 저장소·
 * 프로젝트가 계속 쌓인다 — app/api/design/website/route.ts가 이 함수로 "이번 빌드가 성공한
 * 뒤 직전 버전을 삭제해도 되는지"를 판단한다.
 *
 * 순수 함수로 분리한 이유: 이 라우트 자체는 next/headers의 cookies()가 요청 컨텍스트 밖에서
 * 예외를 던져 이 저장소에서 직접 통합 테스트할 수 없다(Design Automation Phase 1부터 문서화된
 * 기존 제약) — 판단 로직만 떼어내면 그 제약과 무관하게 단위 테스트할 수 있다.
 */
export function shouldCleanupPreviousWebsite(
  previousBuild: Pick<WebsiteBuildRecord, "websiteId"> | null,
  newWebsiteId: string,
  previousWebsite: Pick<WebsiteRecord, "deploymentStatus"> | null | undefined
): boolean {
  // 이 Review로 처음 빌드하는 경우(직전 버전 없음), 또는 어떤 이유로든 이번 빌드가 같은
  // websiteId를 다시 만든 경우(정리할 "다른" 버전이 없음)는 정리 대상이 아니다.
  if (!previousBuild || previousBuild.websiteId === newWebsiteId) return false;

  // 레코드를 찾을 수 없으면(이미 삭제됐거나 데이터가 없음) 안전하게 아무것도 하지 않는다.
  if (!previousWebsite) return false;

  // 이미 "운영 배포 확정"(promoteWebsiteToProduction())을 거친 배포는 실제 고객이 보고 있는
  // 사이트일 수 있으므로 절대 정리 대상에 포함하지 않는다 — 정리 대상은 관리자가 미리보기만
  // 해보고 확정하지 않은 채(PreviewReady/Failed/NotConfigured) 다시 빌드한 시도뿐이다.
  return previousWebsite.deploymentStatus !== "Success";
}
