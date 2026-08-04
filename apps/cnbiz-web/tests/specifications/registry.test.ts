import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  createSpecification,
  getSpecification,
  listSpecifications,
  listSpecificationsByInquiry,
} from "../../lib/specifications/registry";
import type { SpecificationInput, SpecificationResult } from "../../lib/specifications/types";

const INPUT: SpecificationInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "Contact"],
  recommendedFunctions: ["Reservation"],
  requirements: "예약 기능이 필요합니다.",
};

const RESULT: SpecificationResult = {
  overview: "요약",
  pages: [{ name: "Home", description: "메인 페이지" }],
  features: [{ name: "Reservation", description: "예약 기능", priority: "High" }],
  adminFeatures: ["예약 내역 관리"],
  apis: [{ method: "POST", path: "/api/reservations", description: "예약 생성" }],
  dbOverview: "Reservation 테이블 기준",
  scopeIncluded: ["예약 기능 구현"],
  scopeExcluded: ["결제 연동"],
  techStack: ["Next.js", "TypeScript"],
  deliverables: ["배포된 웹사이트"],
};

describe("Specification Registry — lib/specifications/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "specifications-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listSpecifications() returns an empty array before anything is created", async () => {
    expect(await listSpecifications(store)).toEqual([]);
  });

  it("createSpecification() persists a record with a generated id and timestamp", async () => {
    const record = await createSpecification(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.inquiryId).toBe("inquiry-1");
    expect(record.result).toEqual(RESULT);
    expect(record.createdAt).toBeTruthy();
    expect(await listSpecifications(store)).toHaveLength(1);
  });

  it("listSpecifications() returns newest first", async () => {
    const first = await createSpecification(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createSpecification(
      { inquiryId: "inquiry-2", websiteOrderId: "order-2", input: INPUT, result: RESULT, simulated: false },
      store
    );

    const records = await listSpecifications(store);
    expect(records[0].id).toBe(second.id);
    expect(records[1].id).toBe(first.id);
  });

  it("getSpecification() finds by id, undefined for unknown id", async () => {
    const record = await createSpecification(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );

    expect((await getSpecification(record.id, store))?.inquiryId).toBe("inquiry-1");
    expect(await getSpecification("does-not-exist", store)).toBeUndefined();
  });

  it("listSpecificationsByInquiry() filters by inquiryId", async () => {
    await createSpecification(
      { inquiryId: "inquiry-1", websiteOrderId: "order-1", input: INPUT, result: RESULT, simulated: true },
      store
    );
    const own = await createSpecification(
      { inquiryId: "inquiry-2", websiteOrderId: "order-2", input: INPUT, result: RESULT, simulated: true },
      store
    );

    const results = await listSpecificationsByInquiry("inquiry-2", store);
    expect(results.map((r) => r.id)).toEqual([own.id]);
  });
});
