import { describe, expect, it } from "vitest";
import { shouldCleanupPreviousWebsite } from "../../lib/design/website-build-cleanup";
import type { WebsiteBuildRecord } from "../../lib/design/website-build";
import type { WebsiteRecord } from "../../lib/websites/registry";

/**
 * 2026-09-18 실사용 발견 — 같은 Review로 재빌드할 때마다 매번 새 GitHub 저장소·Vercel
 * 프로젝트가 쌓여, 관리자가 어떤 링크가 최신인지 헷갈리는 문제. 이 함수는 "이번 빌드가
 * 성공한 뒤 직전 버전을 지워도 되는지"만 판단하는 순수 함수 — 실제 삭제 호출(app/api/
 * design/website/route.ts)은 next/headers 제약으로 이 저장소에서 통합 테스트할 수 없어
 * (Design Automation Phase 1부터 문서화된 기존 제약), 판단 로직만 여기서 검증한다.
 */

function build(websiteId: string): Pick<WebsiteBuildRecord, "websiteId"> {
  return { websiteId };
}

function website(deploymentStatus: WebsiteRecord["deploymentStatus"]): Pick<WebsiteRecord, "deploymentStatus"> {
  return { deploymentStatus };
}

describe("shouldCleanupPreviousWebsite() (lib/design/website-build-cleanup.ts)", () => {
  it("returns false when there is no previous build (first-ever build for this Review)", () => {
    expect(shouldCleanupPreviousWebsite(null, "website-new", website("PreviewReady"))).toBe(false);
  });

  it("returns false when the previous build already points at the same websiteId (nothing new to clean up)", () => {
    expect(shouldCleanupPreviousWebsite(build("website-a"), "website-a", website("PreviewReady"))).toBe(false);
  });

  it("returns false when the previous website record can't be found (already gone, or no data)", () => {
    expect(shouldCleanupPreviousWebsite(build("website-old"), "website-new", null)).toBe(false);
    expect(shouldCleanupPreviousWebsite(build("website-old"), "website-new", undefined)).toBe(false);
  });

  it("returns true for a previous PreviewReady/Failed/NotConfigured deployment — never confirmed to the client", () => {
    expect(shouldCleanupPreviousWebsite(build("website-old"), "website-new", website("PreviewReady"))).toBe(true);
    expect(shouldCleanupPreviousWebsite(build("website-old"), "website-new", website("Failed"))).toBe(true);
    expect(shouldCleanupPreviousWebsite(build("website-old"), "website-new", website("NotConfigured"))).toBe(true);
    expect(shouldCleanupPreviousWebsite(build("website-old"), "website-new", website(undefined))).toBe(true);
  });

  it("NEVER returns true for a previous deployment already promoted to production (Success) — that may be live for the client", () => {
    expect(shouldCleanupPreviousWebsite(build("website-old"), "website-new", website("Success"))).toBe(false);
  });
});
