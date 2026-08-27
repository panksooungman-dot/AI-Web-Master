import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  createEstimate,
  getEstimate,
  listEstimates,
  listEstimatesByInquiry,
  updateEstimateDocument,
} from "../../lib/estimates/registry";
import type { EstimateInput, EstimateResult } from "../../lib/estimates/types";

const INPUT: EstimateInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "Contact"],
  recommendedFunctions: ["Reservation"],
  requirements: "예약 기능이 필요합니다.",
};

const RESULT: EstimateResult = {
  currency: "KRW",
  lineItems: [{ name: "Home 페이지", description: "메인 페이지", estimatedHours: 8 }],
  priceRangeMin: 1_000_000,
  priceRangeMax: 1_500_000,
  timelineWeeks: 2,
  assumptions: ["기본 가정"],
  summary: "요약",
};

describe("Estimate Registry — lib/estimates/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "estimates-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listEstimates() returns an empty array before anything is created", async () => {
    expect(await listEstimates(store)).toEqual([]);
  });

  it("createEstimate() persists a record with a generated id and timestamp", async () => {
    const record = await createEstimate(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.inquiryId).toBe("inquiry-1");
    expect(record.result).toEqual(RESULT);
    expect(record.createdAt).toBeTruthy();
    expect(await listEstimates(store)).toHaveLength(1);
  });

  it("listEstimates() returns newest first", async () => {
    const first = await createEstimate(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createEstimate(
      { inquiryId: "inquiry-2", websiteOrderId: "order-2", input: INPUT, result: RESULT, simulated: false },
      store
    );

    const records = await listEstimates(store);
    expect(records[0].id).toBe(second.id);
    expect(records[1].id).toBe(first.id);
  });

  it("getEstimate() finds by id, undefined for unknown id", async () => {
    const record = await createEstimate(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );

    expect((await getEstimate(record.id, store))?.inquiryId).toBe("inquiry-1");
    expect(await getEstimate("does-not-exist", store)).toBeUndefined();
  });

  it("listEstimatesByInquiry() filters by inquiryId", async () => {
    await createEstimate({ inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true }, store);
    const own = await createEstimate({ inquiryId: "inquiry-2", websiteOrderId: "order-2", input: INPUT, result: RESULT, simulated: true }, store);

    const results = await listEstimatesByInquiry("inquiry-2", store);
    expect(results.map((r) => r.id)).toEqual([own.id]);
  });

  it("updateEstimateDocument() persists the editable document fields, undefined for unknown id", async () => {
    const record = await createEstimate(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );

    const updated = await updateEstimateDocument(
      record.id,
      { projectTitle: "브라이트 카페 홈페이지 제작", finalAmount: 1_200_000, supplier: { companyName: "씨엔비즈" } },
      store
    );

    expect(updated?.document?.projectTitle).toBe("브라이트 카페 홈페이지 제작");
    expect(updated?.document?.finalAmount).toBe(1_200_000);
    expect(updated?.document?.supplier?.companyName).toBe("씨엔비즈");
    expect((await getEstimate(record.id, store))?.document?.finalAmount).toBe(1_200_000);
    expect(await updateEstimateDocument("does-not-exist", { projectTitle: "x" }, store)).toBeUndefined();
  });
});
