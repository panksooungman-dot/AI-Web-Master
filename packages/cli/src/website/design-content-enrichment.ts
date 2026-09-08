import type { Component, DesignDocument, Page } from "@cnbiz/design-system/types/design";
import type { SiteContent } from "./content.js";

/**
 * Bridges the Content Engine (content.ts, real business-type/audience-aware copy) into a
 * Wireframe-derived DesignDocument (Design Automation chain, structure only — no copy). Before
 * this, a Wireframe Board edit produced the right component *order*, but every Hero/Card/Header/
 * Footer rendered the same hardcoded Korean placeholder regardless of the site's actual business
 * type, because neither Wireframe nor Prototype ever carry marketing copy
 * (DESIGN_AUTOMATION_MASTER.md 12.4 documents this gap). `builder.ts` already generates a
 * `SiteContent` for the scaffold's own 11 fixed pages in the same `ai website create` run — this
 * module reuses that same object (no second Content Engine call, no new AI request) and writes
 * matching fields into `Component.props` before the React Generator renders them, so
 * `tsx.ts`'s landmark renderers (which prefer real props over their fallback placeholder) pick
 * up real copy.
 *
 * Only Hero/Card/Header/Navigation/Sidebar/Footer are enriched — Table/Dashboard/Modal/Search/
 * Pagination have no reasonable SiteContent source (it doesn't model tabular data, stat widgets,
 * or dialog copy) and are deliberately left as-is rather than inventing content for them.
 */

// "seo" is a SiteContent key but never a page — pageContentKeyForPath() has no path that
// maps to it, so it's excluded here to keep the switches below exhaustive without a fake case.
type PageContentKey = Exclude<keyof SiteContent, "seo">;

function pageContentKeyForPath(pagePath: string): PageContentKey {
  const normalized = pagePath === "/" ? "/" : pagePath.replace(/\/$/, "");
  switch (normalized) {
    case "/":
      return "home";
    case "/about":
      return "about";
    case "/services":
      return "services";
    case "/products":
      return "products";
    case "/pricing":
      return "pricing";
    case "/faq":
      return "faq";
    case "/blog":
      return "blog";
    case "/contact":
      return "contact";
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
    default:
      return "notFound";
  }
}

interface HeroCopy {
  headline: string;
  subheadline: string;
  ctaLabel?: string;
}

function heroCopyFor(key: PageContentKey, content: SiteContent): HeroCopy {
  switch (key) {
    case "home":
      return { headline: content.home.headline, subheadline: content.home.subheadline, ctaLabel: content.home.ctaLabel };
    case "about":
      return { headline: content.about.title, subheadline: content.about.intro };
    case "services":
      return { headline: content.services.title, subheadline: content.services.intro };
    case "products":
      return { headline: content.products.title, subheadline: content.products.intro };
    case "pricing":
      return { headline: content.pricing.title, subheadline: content.pricing.intro };
    case "faq":
      return { headline: content.faq.title, subheadline: content.faq.intro };
    case "blog":
      return { headline: content.blog.title, subheadline: content.blog.intro };
    case "contact":
      return { headline: content.contact.title, subheadline: content.contact.intro };
    case "privacy":
      return { headline: content.privacy.title, subheadline: "" };
    case "terms":
      return { headline: content.terms.title, subheadline: "" };
    case "notFound":
      return { headline: content.notFound.title, subheadline: content.notFound.message };
  }
}

interface CardCopy {
  title: string;
  description: string;
}

function cardCopyFor(key: PageContentKey, content: SiteContent): CardCopy[] {
  switch (key) {
    case "home":
      return content.home.features.map((f) => ({ title: f.title, description: f.description }));
    case "about":
      return content.about.values.map((v) => ({ title: v.title, description: v.description }));
    case "services":
      return content.services.items.map((i) => ({ title: i.title, description: i.description }));
    case "products":
      return content.products.items.map((i) => ({ title: i.name, description: i.description }));
    case "pricing":
      return content.pricing.plans.map((p) => ({ title: p.name, description: p.features.join(", ") }));
    case "faq":
      return content.faq.items.map((i) => ({ title: i.question, description: i.answer }));
    case "blog":
      return content.blog.posts.map((p) => ({ title: p.title, description: p.excerpt }));
    default:
      return [];
  }
}

function enrichComponent(
  component: Component,
  landmark: unknown,
  heroCopy: HeroCopy,
  cardCopy: CardCopy[],
  cardIndexRef: { value: number },
  brand: string,
  navItems: Array<{ label: string; href: string }>
): Component {
  if (typeof landmark !== "string") return component;

  switch (landmark) {
    case "Hero":
      return { ...component, props: { ...component.props, ...heroCopy } };
    case "Card": {
      const item = cardCopy[cardIndexRef.value++];
      return item ? { ...component, props: { ...component.props, title: item.title, description: item.description } } : component;
    }
    case "Header":
    case "Navigation":
    case "Sidebar":
      return { ...component, props: { ...component.props, logo: brand, navItems } };
    case "Footer":
      return {
        ...component,
        props: { ...component.props, text: `© ${new Date().getFullYear()} ${brand}. All rights reserved.` },
      };
    default:
      return component;
  }
}

function enrichPage(page: Page, content: SiteContent, brand: string, navItems: Array<{ label: string; href: string }>): Page {
  const key = pageContentKeyForPath(page.path);
  const heroCopy = heroCopyFor(key, content);
  const cardCopy = cardCopyFor(key, content);
  const cardIndexRef = { value: 0 };

  return {
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      components: section.components.map((component) =>
        enrichComponent(component, component.props.sourceType, heroCopy, cardCopy, cardIndexRef, brand, navItems)
      ),
    })),
  };
}

/**
 * `brand`는 `WebsiteInputs.brand`(builder.ts가 이미 갖고 있음, Content Engine 호출과 동일한
 * 출처)를 그대로 받는다 — 새로 추론하지 않는다. `navItems`는 DesignDocument 자신의
 * `pages[].title`/`pages[].path`에서 뽑는다(Storyboard가 실제로 만든 화면 목록이라 지어낸
 * 메뉴가 아니다).
 */
export function enrichDesignDocumentWithContent(document: DesignDocument, content: SiteContent, brand: string): DesignDocument {
  const navItems = document.pages.map((page) => ({ label: page.title, href: page.path }));

  return {
    ...document,
    pages: document.pages.map((page) => enrichPage(page, content, brand, navItems)),
  };
}
