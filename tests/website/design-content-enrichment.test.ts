import { describe, expect, it } from "vitest";
import { enrichDesignDocumentWithContent } from "../../packages/cli/src/website/design-content-enrichment.js";
import { buildDefaultContent } from "../../packages/cli/src/website/content.js";
import type { WebsiteInputs } from "../../packages/cli/src/website/types.js";
import type { Component, DesignDocument, Page } from "@cnbiz/design-system/types/design";

const BASE_INPUTS: WebsiteInputs = {
  projectName: "Bright Smile Dental",
  projectSlug: "bright-smile-dental",
  businessType: "dental clinic",
  targetAudience: "local families",
  brand: "Bright Smile",
  language: "English",
  siteType: "dental",
};

function landmark(id: string, type: Component["type"], sourceType: string, extraProps: Record<string, unknown> = {}): Component {
  return { id, type, props: { sourceType, ...extraProps } };
}

function page(id: string, title: string, path: string, components: Component[]): Page {
  return { id, title, path, sections: [{ id: `${id}-s`, type: "hero", components }] };
}

function baseDocument(pages: Page[]): DesignDocument {
  return {
    version: "1.0.0",
    metadata: { projectName: "Bright Smile Dental", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    theme: { colors: {}, typography: {}, spacing: {}, radius: {}, shadow: {} },
    pages,
  };
}

describe("Website Builder v2 — enrichDesignDocumentWithContent (packages/cli/src/website/design-content-enrichment.ts)", () => {
  const content = buildDefaultContent(BASE_INPUTS);

  it("fills a Hero landmark with the matching page's real headline/subheadline (home vs about differ)", () => {
    const document = baseDocument([
      page("home", "Home", "/", [landmark("hero", "container", "Hero")]),
      page("about", "About", "/about", [landmark("hero", "container", "Hero")]),
    ]);

    const enriched = enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);

    expect(enriched.pages[0].sections[0].components[0].props.headline).toBe(content.home.headline);
    expect(enriched.pages[0].sections[0].components[0].props.subheadline).toBe(content.home.subheadline);
    expect(enriched.pages[1].sections[0].components[0].props.headline).toBe(content.about.title);
    expect(enriched.pages[1].sections[0].components[0].props.subheadline).toBe(content.about.intro);
  });

  it("fills sequential Card landmarks on the Home page from content.home.features, in order", () => {
    const document = baseDocument([
      page("home", "Home", "/", [
        landmark("c1", "card", "Card"),
        landmark("c2", "card", "Card"),
        landmark("c3", "card", "Card"),
      ]),
    ]);

    const enriched = enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);
    const cards = enriched.pages[0].sections[0].components;

    expect(cards[0].props.title).toBe(content.home.features[0].title);
    expect(cards[1].props.title).toBe(content.home.features[1].title);
    expect(cards[2].props.title).toBe(content.home.features[2].title);
  });

  it("maps differently-shaped page content onto the same generic Card {title, description} shape", () => {
    const document = baseDocument([
      page("faq", "FAQ", "/faq", [landmark("c1", "card", "Card")]),
      page("pricing", "Pricing", "/pricing", [landmark("c1", "card", "Card")]),
    ]);

    const enriched = enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);

    // faq.items uses {question, answer} — Card must read it as {title, description}, not leak the original keys.
    expect(enriched.pages[0].sections[0].components[0].props.title).toBe(content.faq.items[0].question);
    expect(enriched.pages[0].sections[0].components[0].props.description).toBe(content.faq.items[0].answer);
    // pricing.plans uses {name, features[]} — title comes from name, description is the joined feature list.
    expect(enriched.pages[1].sections[0].components[0].props.title).toBe(content.pricing.plans[0].name);
    expect(enriched.pages[1].sections[0].components[0].props.description).toBe(content.pricing.plans[0].features.join(", "));
  });

  it("leaves a Card without a matching content index untouched (more cards than content items)", () => {
    const document = baseDocument([
      page("home", "Home", "/", [
        landmark("c1", "card", "Card"),
        landmark("c2", "card", "Card"),
        landmark("c3", "card", "Card"),
        landmark("c4", "card", "Card", { title: "already set" }),
      ]),
    ]);

    expect(content.home.features).toHaveLength(3);
    const enriched = enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);
    expect(enriched.pages[0].sections[0].components[3].props.title).toBe("already set");
  });

  it("fills Header/Navigation/Sidebar with the brand as logo and the DesignDocument's own pages as nav items", () => {
    const document = baseDocument([
      page("home", "Home", "/", [landmark("h", "container", "Header")]),
      page("about", "About", "/about", [landmark("n", "container", "Navigation"), landmark("s", "container", "Sidebar")]),
    ]);

    const enriched = enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);
    const header = enriched.pages[0].sections[0].components[0];
    const nav = enriched.pages[1].sections[0].components[0];
    const sidebar = enriched.pages[1].sections[0].components[1];

    expect(header.props.logo).toBe(BASE_INPUTS.brand);
    expect(header.props.navItems).toEqual([
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
    ]);
    expect(nav.props.navItems).toEqual(header.props.navItems);
    expect(sidebar.props.navItems).toEqual(header.props.navItems);
  });

  it("fills Footer with a brand-attributed copyright line", () => {
    const document = baseDocument([page("home", "Home", "/", [landmark("f", "container", "Footer")])]);
    const enriched = enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);
    expect(enriched.pages[0].sections[0].components[0].props.text).toContain(BASE_INPUTS.brand);
  });

  it("does not touch Table/Dashboard/Modal/Search/Pagination — no SiteContent source for them", () => {
    const document = baseDocument([
      page("home", "Home", "/", [
        landmark("t", "grid", "Table"),
        landmark("d", "grid", "Dashboard"),
        landmark("m", "container", "Modal"),
        landmark("se", "input", "Search"),
        landmark("p", "button", "Pagination"),
      ]),
    ]);

    const enriched = enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);
    for (const component of enriched.pages[0].sections[0].components) {
      expect(component.props).toEqual({ sourceType: component.props.sourceType });
    }
  });

  it("does not mutate the input DesignDocument (pure function)", () => {
    const document = baseDocument([page("home", "Home", "/", [landmark("hero", "container", "Hero")])]);
    const before = JSON.parse(JSON.stringify(document));
    enrichDesignDocumentWithContent(document, content, BASE_INPUTS.brand);
    expect(document).toEqual(before);
  });
});
