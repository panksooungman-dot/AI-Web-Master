import { describe, expect, it } from "vitest";
import { generateContract } from "../../lib/contracts/generator";
import type { ContractInput } from "../../lib/contracts/types";
import type { ChatResult } from "../../lib/ai/bridge";

const BASE_INPUT: ContractInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다. 메뉴 소개와 예약 기능이 필요합니다.",
  scopeIncluded: ["4개 페이지 디자인", "예약 기능 구현"],
  scopeExcluded: ["결제 연동"],
  deliverables: ["배포된 웹사이트", "소스코드"],
  priceRangeMin: 3_000_000,
  priceRangeMax: 4_500_000,
  totalDurationWeeks: 5,
  totalDurationDays: 34,
  milestoneNames: ["요구사항 완료", "디자인 완료", "개발 완료", "QA 완료", "배포 완료"],
};

const VALID_JUDGMENT = {
  title: "브라이트 카페 홈페이지 제작 계약서",
  overview: "브라이트 카페의 예약 기반 홈페이지 제작 계약입니다.",
  purpose: "갑의 홈페이지 제작을 을이 수행함을 목적으로 한다.",
  developmentScope: ["4개 페이지 디자인", "예약 기능 구현"],
  excludedScope: ["결제 연동"],
  schedule: "계약 체결일로부터 5주 이내 완료한다.",
  contractAmount: { amount: 3_750_000, currency: "KRW", vatIncluded: false },
  paymentTerms: ["계약금 30%", "중도금 40%", "잔금 30%"],
  deliverables: ["배포된 웹사이트", "소스코드"],
  acceptanceCriteria: ["검수 요청일로부터 7일 이내 통보"],
  maintenance: "배포 후 30일간 무상 하자보수를 제공한다.",
  changeRequestPolicy: "범위 외 변경은 별도 협의한다.",
  terminationClause: "중대한 위반 시 서면 통지로 해지할 수 있다.",
  intellectualProperty: "잔금 지급 완료 후 저작권은 갑에게 귀속된다.",
  confidentiality: "양 당사자는 영업비밀을 누설하지 않는다.",
  specialTerms: [],
};

describe("Contract Generator — generateContract()", () => {
  it("uses the AI-provided judgment (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_JUDGMENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.provider).toBe("anthropic");
    expect(outcome.result.title).toBe(VALID_JUDGMENT.title);
    expect(outcome.result.contractAmount).toEqual(VALID_JUDGMENT.contractAmount);
    expect(outcome.result.developmentScope).toEqual(VALID_JUDGMENT.developmentScope);
    expect(outcome.result.paymentTerms).toEqual(VALID_JUDGMENT.paymentTerms);
  });

  it("falls back to a deterministic contract (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.title.length).toBeGreaterThan(0);
    expect(outcome.result.developmentScope).toEqual(BASE_INPUT.scopeIncluded);
    expect(outcome.result.excludedScope).toEqual(BASE_INPUT.scopeExcluded);
    expect(outcome.result.deliverables).toEqual(BASE_INPUT.deliverables);
    // 계약 금액은 견적 가격 범위의 중간값을 만원 단위로 반올림한 값이어야 한다.
    expect(outcome.result.contractAmount.amount).toBe(3_750_000);
    expect(outcome.result.contractAmount.currency).toBe("KRW");
    expect(outcome.result.paymentTerms).toHaveLength(3);
    expect(outcome.result.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(outcome.result.overview.length).toBeGreaterThan(0);
  });

  it("falls back to a deterministic contract (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.overview.length).toBeGreaterThan(0);
  });

  it("falls back when a required judgment field is missing (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, maintenance: undefined };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when developmentScope is empty (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, developmentScope: [] };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when contractAmount is malformed (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, contractAmount: { amount: "many", currency: "KRW", vatIncluded: false } };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("strips a ```json code fence before parsing (same convention as lib/estimates/generator.ts)", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: fenced });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.title).toBe(VALID_JUDGMENT.title);
  });

  it("still succeeds (simulated:false) when the model wraps the fence in leading/trailing prose (real-model habit, lib/ai/json.ts)", async () => {
    const withProse =
      "Here is the contract:\n```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```\nLet me know if you need adjustments.";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: withProse });

    const outcome = await generateContract(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.title).toBe(VALID_JUDGMENT.title);
  });

  it("scales the deterministic fallback contract amount with the estimate price range", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const small = await generateContract({ ...BASE_INPUT, priceRangeMin: 1_000_000, priceRangeMax: 1_500_000 }, fakeChat);
    const large = await generateContract({ ...BASE_INPUT, priceRangeMin: 8_000_000, priceRangeMax: 10_000_000 }, fakeChat);

    expect(large.result.contractAmount.amount).toBeGreaterThan(small.result.contractAmount.amount);
  });

  it("splits the fallback payment terms so the three installments sum to the contract amount", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateContract(BASE_INPUT, fakeChat);
    expect(outcome.result.paymentTerms).toHaveLength(3);

    const amounts = outcome.result.paymentTerms.map((term) => {
      const match = term.match(/([\d,]+)원/);
      return match ? Number(match[1].replace(/,/g, "")) : NaN;
    });

    expect(amounts.every((amount) => Number.isFinite(amount))).toBe(true);
    const sum = amounts.reduce((total, amount) => total + amount, 0);
    expect(sum).toBe(outcome.result.contractAmount.amount);
  });
});
