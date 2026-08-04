import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createTimeline, getTimeline, listTimelines, listTimelinesByInquiry } from "../../lib/timeline/registry";
import type { TimelineInput, TimelineResult } from "../../lib/timeline/types";

const INPUT: TimelineInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "예약 기능이 필요합니다.",
  pageCount: 2,
  featureCount: 1,
  scopeIncluded: ["예약 기능 구현"],
  estimateTimelineWeeks: 2,
};

const RESULT: TimelineResult = {
  overview: "요약",
  totalDurationWeeks: 4,
  totalDurationDays: 28,
  phases: [{ name: "기획", description: "요구사항 확정", durationDays: 3, startOffsetDays: 0 }],
  milestones: [{ name: "요구사항 완료", description: "기획 종료", dueOffsetDays: 3 }],
  weeklyPlan: [{ weekNumber: 1, focus: "기획", tasks: ["요구사항 정리"] }],
  assumptions: ["기본 가정"],
};

describe("Timeline Registry — lib/timeline/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listTimelines() returns an empty array before anything is created", async () => {
    expect(await listTimelines(store)).toEqual([]);
  });

  it("createTimeline() persists a record with a generated id and timestamp", async () => {
    const record = await createTimeline(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.inquiryId).toBe("inquiry-1");
    expect(record.estimateId).toBe("estimate-1");
    expect(record.specificationId).toBe("specification-1");
    expect(record.result).toEqual(RESULT);
    expect(record.createdAt).toBeTruthy();
    expect(await listTimelines(store)).toHaveLength(1);
  });

  it("listTimelines() returns newest first", async () => {
    const first = await createTimeline(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createTimeline(
      {
        inquiryId: "inquiry-2",
        websiteOrderId: "order-2",
        estimateId: "estimate-2",
        specificationId: "specification-2",
        input: INPUT,
        result: RESULT,
        simulated: false,
      },
      store
    );

    const records = await listTimelines(store);
    expect(records[0].id).toBe(second.id);
    expect(records[1].id).toBe(first.id);
  });

  it("getTimeline() finds by id, undefined for unknown id", async () => {
    const record = await createTimeline(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    expect((await getTimeline(record.id, store))?.inquiryId).toBe("inquiry-1");
    expect(await getTimeline("does-not-exist", store)).toBeUndefined();
  });

  it("listTimelinesByInquiry() filters by inquiryId", async () => {
    await createTimeline(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );
    const own = await createTimeline(
      {
        inquiryId: "inquiry-2",
        websiteOrderId: "order-2",
        estimateId: "estimate-2",
        specificationId: "specification-2",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    const results = await listTimelinesByInquiry("inquiry-2", store);
    expect(results.map((r) => r.id)).toEqual([own.id]);
  });
});
