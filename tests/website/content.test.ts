import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDefaultContent, generateSiteContent } from "../../packages/cli/src/website/content.js";
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
  });
});
