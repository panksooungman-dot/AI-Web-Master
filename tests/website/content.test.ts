import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildContentSystemPrompt, buildDefaultContent, generateSiteContent } from "../../packages/cli/src/website/content.js";
import { WEBSITE_TYPES, type WebsiteInputs } from "../../packages/cli/src/website/types.js";

const BASE_INPUTS: WebsiteInputs = {
  projectName: "Bright Smile Dental",
  projectSlug: "bright-smile-dental",
  businessType: "dental clinic",
  targetAudience: "local families",
  brand: "Bright Smile",
  language: "English",
  siteType: "dental",
};

describe("Website Builder v2 — Content Generator (packages/cli/src/website/content.ts)", () => {
  describe("buildDefaultContent()", () => {
    it("populates every SiteContent section with non-empty, on-brand copy", () => {
      const content = buildDefaultContent(BASE_INPUTS);

      expect(content.home.headline).toContain("Bright Smile Dental");
      expect(content.home.features).toHaveLength(3);
      expect(content.home.testimonials).toHaveLength(2);
      expect(content.about.values).toHaveLength(3);
      expect(content.services.items).toHaveLength(4);
      expect(content.products.items).toHaveLength(3);
      expect(content.pricing.plans).toHaveLength(3);
      expect(content.faq.items).toHaveLength(5);
      expect(content.blog.posts).toHaveLength(3);
      expect(content.privacy.body.length).toBeGreaterThan(0);
      expect(content.terms.body.length).toBeGreaterThan(0);
      expect(content.notFound.title.length).toBeGreaterThan(0);
      expect(content.seo.title).toContain("Bright Smile Dental");
      expect(content.seo.description.length).toBeGreaterThan(0);
    });

    it("derives the contact email from the project slug", () => {
      const content = buildDefaultContent(BASE_INPUTS);
      expect(content.contact.email).toBe("hello@bright-smile-dental.com");
    });

    it("exactly one pricing plan is highlighted (the middle tier)", () => {
      const content = buildDefaultContent(BASE_INPUTS);
      const highlighted = content.pricing.plans.filter((p) => p.highlighted);
      expect(highlighted).toHaveLength(1);
      expect(highlighted[0].name).toBe("Growth");
    });

    it.each(WEBSITE_TYPES)("produces valid, non-empty content for site type %s", (siteType) => {
      const content = buildDefaultContent({ ...BASE_INPUTS, siteType });

      expect(content.home.headline.length).toBeGreaterThan(0);
      expect(content.home.features).toHaveLength(3);
      expect(content.services.items).toHaveLength(4);
      expect(content.pricing.plans).toHaveLength(3);
    });
  });

  describe("buildContentSystemPrompt() — additionalContext (2026-09-17, Design 체인↔Content Engine 연결)", () => {
    it("does not change the prompt when additionalContext is absent", () => {
      const withoutContext = buildContentSystemPrompt(BASE_INPUTS);
      const withUndefined = buildContentSystemPrompt({ ...BASE_INPUTS, additionalContext: undefined });
      expect(withoutContext).toBe(withUndefined);
      expect(withoutContext).not.toContain("Additional project context");
    });

    it("does not change the prompt when additionalContext is empty/whitespace", () => {
      const prompt = buildContentSystemPrompt({ ...BASE_INPUTS, additionalContext: "   " });
      expect(prompt).toBe(buildContentSystemPrompt(BASE_INPUTS));
    });

    it("appends the real planning details verbatim when additionalContext is provided", () => {
      const context =
        "대표 메뉴: 사색찬미 정식(28,000원, 제철 나물과 정갈한 밑반찬, 갓 지은 솥밥). " +
        "소개: 사계절 담은 정성으로 지역 주민과 함께 성장해온 정통 한정식 전문점.";
      const prompt = buildContentSystemPrompt({ ...BASE_INPUTS, additionalContext: context });

      expect(prompt).toContain("Additional project context");
      expect(prompt).toContain(context);
      // 기존 프롬프트 뒤에 그대로 이어붙는지(기존 지시문이 손상되지 않는지) 확인.
      expect(prompt.indexOf(context)).toBeGreaterThan(prompt.indexOf('"blogPosts"'));
    });

    it("trims surrounding whitespace before appending", () => {
      const prompt = buildContentSystemPrompt({ ...BASE_INPUTS, additionalContext: "  실제 정보  \n" });
      expect(prompt).toContain("실제 정보");
      expect(prompt).not.toContain("실제 정보  \n");
    });
  });

  describe("generateSiteContent()", () => {
    let cwd: string;

    beforeEach(() => {
      cwd = fs.mkdtempSync(path.join(os.tmpdir(), "website-content-test-"));
    });

    afterEach(() => {
      fs.rmSync(cwd, { recursive: true, force: true });
    });

    it("falls back to buildDefaultContent() (simulated:true) when no provider is configured", async () => {
      const result = await generateSiteContent(cwd, BASE_INPUTS);

      expect(result.simulated).toBe(true);
      expect(result.content).toEqual(buildDefaultContent(BASE_INPUTS));
      expect(result.provider).toBeUndefined();
    });

    it("preserves the actual fallback reason instead of discarding it (2026-09-17 diagnostic fix)", async () => {
      // 실제 프로덕션에서 ANTHROPIC_API_KEY가 설정돼 있는데도 Simulated가 뜨는 문제를 조사하다,
      // 지금까지는 ProviderManager.complete()가 계산한 실패 사유가 어디에도 남지 않는 것을
      // 발견했다 — simulated 불리언만 남기고 진단 정보를 그냥 버리고 있었다.
      const result = await generateSiteContent(cwd, BASE_INPUTS);

      expect(result.simulated).toBe(true);
      expect(result.simulatedReason).toBeDefined();
      expect(result.simulatedReason).toContain("unavailable");
    });
  });
});
