import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  createContract,
  getContract,
  listContracts,
  listContractsByInquiry,
  recordContractClientSignature,
  updateContractDocument,
  updateContractResult,
} from "../../lib/contracts/registry";
import type { ContractDocumentDetails, ContractInput, ContractResult, ContractSignature } from "../../lib/contracts/types";

const INPUT: ContractInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "예약 기능이 필요합니다.",
  scopeIncluded: ["예약 기능 구현"],
  scopeExcluded: ["결제 연동"],
  deliverables: ["배포된 웹사이트"],
  priceRangeMin: 1_000_000,
  priceRangeMax: 1_500_000,
  totalDurationWeeks: 4,
  totalDurationDays: 28,
  milestoneNames: ["요구사항 완료"],
};

const RESULT: ContractResult = {
  title: "브라이트 카페 홈페이지 제작 계약서",
  overview: "요약",
  purpose: "목적",
  developmentScope: ["예약 기능 구현"],
  excludedScope: ["결제 연동"],
  schedule: "4주 이내 완료",
  contractAmount: { amount: 1_250_000, currency: "KRW", vatIncluded: false },
  paymentTerms: ["계약금", "중도금", "잔금"],
  deliverables: ["배포된 웹사이트"],
  acceptanceCriteria: ["검수 기준"],
  maintenance: "30일 무상 하자보수",
  changeRequestPolicy: "별도 협의",
  terminationClause: "서면 통지로 해지",
  intellectualProperty: "잔금 완료 후 갑에게 귀속",
  confidentiality: "비밀유지 의무",
  specialTerms: [],
};

describe("Contract Registry — lib/contracts/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "contracts-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listContracts() returns an empty array before anything is created", async () => {
    expect(await listContracts(store)).toEqual([]);
  });

  it("createContract() persists a record with a generated id and timestamp", async () => {
    const record = await createContract(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
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
    expect(record.timelineId).toBe("timeline-1");
    expect(record.result).toEqual(RESULT);
    expect(record.createdAt).toBeTruthy();
    expect(await listContracts(store)).toHaveLength(1);
  });

  it("listContracts() returns newest first", async () => {
    const first = await createContract(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createContract(
      {
        inquiryId: "inquiry-2",
        websiteOrderId: "order-2",
        estimateId: "estimate-2",
        specificationId: "specification-2",
        timelineId: "timeline-2",
        input: INPUT,
        result: RESULT,
        simulated: false,
      },
      store
    );

    const records = await listContracts(store);
    expect(records[0].id).toBe(second.id);
    expect(records[1].id).toBe(first.id);
  });

  it("getContract() finds by id, undefined for unknown id", async () => {
    const record = await createContract(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    expect((await getContract(record.id, store))?.inquiryId).toBe("inquiry-1");
    expect(await getContract("does-not-exist", store)).toBeUndefined();
  });

  it("listContractsByInquiry() filters by inquiryId", async () => {
    await createContract(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );
    const own = await createContract(
      {
        inquiryId: "inquiry-2",
        websiteOrderId: "order-2",
        estimateId: "estimate-2",
        specificationId: "specification-2",
        timelineId: "timeline-2",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    const results = await listContractsByInquiry("inquiry-2", store);
    expect(results.map((r) => r.id)).toEqual([own.id]);
  });

  it("updateContractResult() overwrites result and preserves everything else", async () => {
    const record = await createContract(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    const editedResult: ContractResult = {
      ...RESULT,
      title: "관리자가 수정한 제목",
      contractAmount: { amount: 2_000_000, currency: "KRW", vatIncluded: true },
      specialTerms: ["특약 1"],
    };

    const updated = await updateContractResult(record.id, editedResult, store);

    expect(updated?.result).toEqual(editedResult);
    expect(updated?.inquiryId).toBe("inquiry-1");
    expect(updated?.createdAt).toBe(record.createdAt);
    expect((await getContract(record.id, store))?.result.title).toBe("관리자가 수정한 제목");
  });

  it("updateContractResult() returns undefined for an unknown id", async () => {
    expect(await updateContractResult("does-not-exist", RESULT, store)).toBeUndefined();
  });

  it("updateContractDocument() sets document and preserves result untouched", async () => {
    const record = await createContract(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    const document: ContractDocumentDetails = {
      supplier: { companyName: "씨엔비즈", sealImageUrl: "https://example.com/seal.png" },
      client: { companyName: "브라이트 카페", contactName: "홍길동" },
    };

    const updated = await updateContractDocument(record.id, document, store);

    expect(updated?.document).toEqual(document);
    expect(updated?.result).toEqual(RESULT);
    expect((await getContract(record.id, store))?.document?.supplier?.sealImageUrl).toBe(
      "https://example.com/seal.png"
    );
  });

  it("updateContractDocument() returns undefined for an unknown id", async () => {
    expect(await updateContractDocument("does-not-exist", {}, store)).toBeUndefined();
  });

  it("recordContractClientSignature() sets clientSignature and allows overwriting on re-sign", async () => {
    const record = await createContract(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    const firstSignature: ContractSignature = {
      imageDataUrl: "data:image/png;base64,AAA",
      signerName: "홍길동",
      signedAt: "2026-09-13T00:00:00.000Z",
    };
    const firstUpdate = await recordContractClientSignature(record.id, firstSignature, store);
    expect(firstUpdate?.clientSignature).toEqual(firstSignature);

    const resignature: ContractSignature = {
      imageDataUrl: "data:image/png;base64,BBB",
      signerName: "홍길동",
      signedAt: "2026-09-14T00:00:00.000Z",
    };
    const secondUpdate = await recordContractClientSignature(record.id, resignature, store);
    expect(secondUpdate?.clientSignature).toEqual(resignature);
    expect((await getContract(record.id, store))?.clientSignature).toEqual(resignature);
  });

  it("recordContractClientSignature() returns undefined for an unknown id", async () => {
    expect(
      await recordContractClientSignature(
        "does-not-exist",
        { imageDataUrl: "data:image/png;base64,AAA", signerName: "홍길동", signedAt: "2026-09-13T00:00:00.000Z" },
        store
      )
    ).toBeUndefined();
  });
});
