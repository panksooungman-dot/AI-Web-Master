import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { planToWebsiteBuildInputs } from "../../lib/design/website-build-adapter";
import { getLatestWebsiteBuildForReview, getWebsiteBuildRecord, recordWebsiteBuild } from "../../lib/design/website-build";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

/**
 * Integration coverage for Design Automation Phase 9 (Website Builder Integration), mirroring
 * tests/design/design-sync-integration.test.ts's approach for Phase 8.
 *
 * As with Phase 1-8, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/website's route handlers directly) does NOT work in this repo: those routes call
 * getCurrentActorEmail() → next/headers's cookies(), which throws outside the Next.js
 * request-handling runtime. On top of that, the route also spawns a real
 * `node packages/cli/dist/index.js website create` child process, which is deliberately out of
 * scope for a vitest suite (requires a built CLI, takes seconds). This file integration-tests the
 * layer directly beneath the route (adapter + registry, real filesystem I/O) using a fabricated
 * CLI result — the route itself (including the CLI invocation) is verified via curl/Playwright
 * E2E separately.
 */
describe("Design Automation Phase 9 — website build adapter + registry integration", () => {
  let baseDir: string;

  const planInput: DesignPlanInput = {
    projectName: "Website Build Integration Studio",
    projectType: "치과 웹사이트",
    requirements: "온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다.",
    targetUsers: "지역 주민, 30~50대",
  };

  const plan: DesignPlanRecord = {
    id: "design-plan-website-build-integration",
    input: planInput,
    content: buildDefaultDesignPlan(planInput),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const reviewId = "review-website-build-integration";
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-build-integration-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("maps the Design Plan to Website Builder inputs consistent with its projectType", () => {
    const inputs = planToWebsiteBuildInputs(plan);

    expect(inputs.name).toBe(planInput.projectName);
    expect(inputs.businessType).toBe(planInput.projectType);
    expect(inputs.audience).toBe(planInput.targetUsers);
    expect(inputs.siteType).toBe("dental");
  });

  it("records a successful build end-to-end and links it back to the review/plan chain", async () => {
    const inputs = planToWebsiteBuildInputs(plan);
    const previous = await getLatestWebsiteBuildForReview(reviewId, store);
    expect(previous).toBeNull();

    // Stand-in for what the route does after a successful `execute()` CLI invocation:
    // a WebsiteRecord already exists (lib/websites/registry.ts, out of scope here) and we only
    // record the Design-chain linkage.
    const record = await recordWebsiteBuild(
      {
        reviewId,
        planId: plan.id,
        websiteId: "website-success-1",
        siteType: inputs.siteType,
        status: "Success",
        simulatedContent: false,
      },
      store
    );

    expect(record.version).toBe(1);
    expect(record.reviewId).toBe(reviewId);
    expect(record.planId).toBe(plan.id);
    expect((await getWebsiteBuildRecord(record.id, store))?.status).toBe("Success");
  });

  it("a retry after a failed build increments the version and preserves the failure in history", async () => {
    const inputs = planToWebsiteBuildInputs(plan);

    const failed = await recordWebsiteBuild(
      { reviewId, planId: plan.id, websiteId: "website-failed-1", siteType: inputs.siteType, status: "Failed", simulatedContent: false, error: "packages/cli가 아직 빌드되지 않았습니다." },
      store
    );
    expect(failed.version).toBe(1);
    expect(failed.status).toBe("Failed");

    const retried = await recordWebsiteBuild(
      { reviewId, planId: plan.id, websiteId: "website-success-2", siteType: inputs.siteType, status: "Success", simulatedContent: false },
      store
    );

    expect(retried.id).toBe(failed.id);
    expect(retried.version).toBe(2);
    expect(retried.status).toBe("Success");
    expect(retried.history).toHaveLength(2);
    expect(retried.history[0].status).toBe("Failed");
    expect(retried.history[1].status).toBe("Success");
    expect((await getLatestWebsiteBuildForReview(reviewId, store))?.id).toBe(retried.id);
  });
});
