import { getProviderManager } from "../providers/manager.js";
import { renderPromptTemplate } from "../prompt/renderer.js";
import { SITE_TYPE_COPY, type WebsiteInputs } from "./types.js";

export interface FeatureItem {
  title: string;
  description: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ServiceItem {
  title: string;
  description: string;
}

export interface ProductItem {
  name: string;
  description: string;
  price: string;
}

export interface BlogPost {
  title: string;
  excerpt: string;
}

export interface ValueItem {
  title: string;
  description: string;
}

export interface SiteContent {
  home: {
    kicker: string;
    headline: string;
    subheadline: string;
    ctaLabel: string;
    features: FeatureItem[];
    testimonials: TestimonialItem[];
    ctaTitle: string;
    ctaSubtitle: string;
    newsletterTitle: string;
    newsletterSubtitle: string;
  };
  about: { title: string; intro: string; body: string; values: ValueItem[] };
  services: { title: string; intro: string; items: ServiceItem[] };
  products: { title: string; intro: string; items: ProductItem[] };
  pricing: { title: string; intro: string; plans: PricingPlan[] };
  faq: { title: string; intro: string; items: FaqItem[] };
  blog: { title: string; intro: string; posts: BlogPost[] };
  contact: { title: string; intro: string; email: string };
  privacy: { title: string; body: string[] };
  terms: { title: string; body: string[] };
  notFound: { title: string; message: string };
  seo: { title: string; description: string };
}

/**
 * Provider 없이도(혹은 AI 응답이 실패/형식 불일치해도) 항상 유효한 콘텐츠를 만드는
 * 결정론적 기본값. Agent Runtime의 "시뮬레이션 폴백"과 동일한 철학 —
 * AI가 없어도 빌드 가능한 결과를 보장한다.
 */
export function buildDefaultContent(inputs: WebsiteInputs): SiteContent {
  const { projectName, businessType, targetAudience, brand } = inputs;
  const copy = SITE_TYPE_COPY[inputs.siteType];
  const [feature1, feature2, feature3] = copy.featureTitles;
  const [service1, service2, service3, service4] = copy.serviceTitles;

  return {
    home: {
      kicker: copy.kicker,
      headline: `${projectName} — ${businessType} for ${targetAudience}`,
      subheadline: `${brand} helps ${targetAudience} get more from ${businessType.toLowerCase()}, with a team that cares about the details.`,
      ctaLabel: "Get in Touch",
      features: [
        { title: feature1, description: `${brand} is built to be ${feature1.toLowerCase()}, so ${targetAudience} can trust every result.` },
        { title: feature2, description: `We keep things ${feature2.toLowerCase()} for ${targetAudience}, without unnecessary complexity.` },
        { title: feature3, description: `${brand} is ${feature3.toLowerCase()}, designed to grow alongside ${targetAudience}.` }
      ],
      testimonials: [
        {
          quote: `${brand} completely changed how we think about ${businessType.toLowerCase()}. The team is responsive and the results speak for themselves.`,
          author: "Jamie Lee",
          role: `${targetAudience} partner`
        },
        {
          quote: `Working with ${brand} felt effortless from day one. Highly recommended for anyone in ${targetAudience}.`,
          author: "Alex Kim",
          role: "Long-time customer"
        }
      ],
      ctaTitle: `Ready to work with ${brand}?`,
      ctaSubtitle: `Tell us about your goals and we'll get back to you within one business day.`,
      newsletterTitle: "Stay in the loop",
      newsletterSubtitle: `Get occasional updates from ${brand} — no spam, unsubscribe anytime.`
    },
    about: {
      title: `About ${brand}`,
      intro: `${brand} is a ${businessType} built for ${targetAudience}.`,
      body: `${projectName} started with a simple goal: make ${businessType.toLowerCase()} genuinely better for ${targetAudience}. Every decision we make — from how we design our services to how we support our customers — comes back to that goal.`,
      values: [
        { title: "Trust", description: `We earn the trust of ${targetAudience} through consistent, honest work.` },
        { title: "Quality", description: `${brand} holds every project to a high standard, without shortcuts.` },
        { title: "Partnership", description: `We see ourselves as a long-term partner for ${targetAudience}, not a one-time vendor.` }
      ]
    },
    services: {
      title: "Our Services",
      intro: `${brand} offers a focused set of services for ${targetAudience}.`,
      items: [
        { title: service1, description: `Comprehensive ${service1.toLowerCase()} tailored to ${targetAudience}.` },
        { title: service2, description: `Hands-on ${service2.toLowerCase()} delivered by the ${brand} team.` },
        { title: service3, description: `Ongoing ${service3.toLowerCase()} so you're never left without support.` },
        { title: service4, description: `Continuous ${service4.toLowerCase()} to keep results improving over time.` }
      ]
    },
    products: {
      title: copy.productNoun,
      intro: `Explore what ${brand} has to offer ${targetAudience}.`,
      items: [
        { name: `${copy.productNoun.replace(/s$/, "")} Starter`, description: `A focused starting point for ${targetAudience}.`, price: "Contact us" },
        { name: `${copy.productNoun.replace(/s$/, "")} Standard`, description: `Our most popular option for ${targetAudience}.`, price: "Contact us" },
        { name: `${copy.productNoun.replace(/s$/, "")} Premium`, description: `The full ${brand} experience, end to end.`, price: "Contact us" }
      ]
    },
    pricing: {
      title: copy.pricingNoun,
      intro: `Simple, transparent ${copy.pricingNoun.toLowerCase()} for ${targetAudience}.`,
      plans: [
        {
          name: "Starter",
          price: "$0",
          period: "/mo",
          features: ["Core features", "Community support", "Up to 1 seat"],
          highlighted: false
        },
        {
          name: "Growth",
          price: "$49",
          period: "/mo",
          features: ["Everything in Starter", "Priority support", "Up to 10 seats", "Advanced reporting"],
          highlighted: true
        },
        {
          name: "Enterprise",
          price: "Contact us",
          period: "",
          features: ["Everything in Growth", "Dedicated success manager", "Unlimited seats", "Custom integrations"],
          highlighted: false
        }
      ]
    },
    faq: {
      title: "Frequently Asked Questions",
      intro: `Answers to common questions from ${targetAudience}.`,
      items: [
        { question: `What does ${brand} do?`, answer: `${brand} provides ${businessType.toLowerCase()} designed specifically for ${targetAudience}.` },
        { question: "How do I get started?", answer: "Reach out through the contact page and our team will follow up within one business day." },
        { question: "Do you offer support after onboarding?", answer: `Yes — ongoing support is included with every ${brand} engagement.` },
        { question: "Can I customize my plan?", answer: "Yes, every plan can be tailored to your needs — just let us know what you're looking for." },
        { question: "Where are you located?", answer: "Details are available on our contact page." }
      ]
    },
    blog: {
      title: "Blog",
      intro: `Insights and updates from the ${brand} team.`,
      posts: [
        { title: `Why ${targetAudience} choose ${brand}`, excerpt: `A look at what makes ${brand} different for ${targetAudience}.` },
        { title: `5 tips for getting the most out of ${businessType}`, excerpt: "Practical advice from our team, based on real experience." },
        { title: `What's next for ${brand}`, excerpt: "A quick look at what we're building next." }
      ]
    },
    contact: {
      title: "Contact Us",
      intro: `Have a question for ${brand}? Send us a message and we'll get back to you soon.`,
      email: `hello@${inputs.projectSlug}.com`
    },
    privacy: {
      title: "Privacy Policy",
      body: [
        `${brand} ("we", "us", "our") respects your privacy. This page explains what information we collect and how we use it.`,
        "We collect information you provide directly to us, such as your name, email address, and any message content when you contact us.",
        "We use this information solely to respond to your inquiries and improve our services. We do not sell your personal information to third parties.",
        "You may request access to, correction of, or deletion of your personal information at any time by contacting us.",
        "This policy may be updated from time to time. Continued use of this site constitutes acceptance of the current policy."
      ]
    },
    terms: {
      title: "Terms of Service",
      body: [
        `By using this website, you agree to the following terms and conditions set by ${brand}.`,
        "All content on this site is provided for general informational purposes and is subject to change without notice.",
        `${brand} makes no warranties about the completeness or accuracy of the information on this site.`,
        "You agree not to misuse this site or interfere with its normal operation.",
        "These terms are governed by the laws applicable in the jurisdiction in which we operate."
      ]
    },
    notFound: {
      title: "Page Not Found",
      message: `We couldn't find the page you're looking for. It may have been moved or no longer exists.`
    },
    seo: {
      title: `${projectName} | ${businessType}`,
      description: `${projectName} is a ${businessType} serving ${targetAudience}.`
    }
  };
}

/** AI 응답에서 병합할 필드만 담는 느슨한 타입 — 누락/형식 오류는 전부 기본값으로 폴백된다. */
interface ContentOverrides {
  headline?: string;
  subheadline?: string;
  aboutIntro?: string;
  aboutBody?: string;
  servicesIntro?: string;
  productsIntro?: string;
  pricingIntro?: string;
  faqIntro?: string;
  blogIntro?: string;
  contactIntro?: string;
  seoTitle?: string;
  seoDescription?: string;
  features?: FeatureItem[];
  testimonials?: TestimonialItem[];
  values?: ValueItem[];
  services?: ServiceItem[];
  products?: ProductItem[];
  plans?: Array<{ name: string; price: string; period: string; features: string[] }>;
  faq?: FaqItem[];
  blogPosts?: BlogPost[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pickString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter(isNonEmptyString);
  return items.length > 0 ? items : undefined;
}

function pickItems<T>(value: unknown, shape: (item: Record<string, unknown>) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: T[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const parsed = shape(raw as Record<string, unknown>);
    if (parsed) items.push(parsed);
  }
  return items.length > 0 ? items : undefined;
}

function parseOverrides(raw: string): ContentOverrides | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const data = parsed as Record<string, unknown>;

  return {
    headline: pickString(data.headline),
    subheadline: pickString(data.subheadline),
    aboutIntro: pickString(data.aboutIntro),
    aboutBody: pickString(data.aboutBody),
    servicesIntro: pickString(data.servicesIntro),
    productsIntro: pickString(data.productsIntro),
    pricingIntro: pickString(data.pricingIntro),
    faqIntro: pickString(data.faqIntro),
    blogIntro: pickString(data.blogIntro),
    contactIntro: pickString(data.contactIntro),
    seoTitle: pickString(data.seoTitle),
    seoDescription: pickString(data.seoDescription),
    features: pickItems(data.features, (item) => {
      const title = pickString(item.title);
      const description = pickString(item.description);
      return title && description ? { title, description } : undefined;
    }),
    testimonials: pickItems(data.testimonials, (item) => {
      const quote = pickString(item.quote);
      const author = pickString(item.author);
      const role = pickString(item.role);
      return quote && author && role ? { quote, author, role } : undefined;
    }),
    values: pickItems(data.values, (item) => {
      const title = pickString(item.title);
      const description = pickString(item.description);
      return title && description ? { title, description } : undefined;
    }),
    services: pickItems(data.services, (item) => {
      const title = pickString(item.title);
      const description = pickString(item.description);
      return title && description ? { title, description } : undefined;
    }),
    products: pickItems(data.products, (item) => {
      const name = pickString(item.name);
      const description = pickString(item.description);
      const price = pickString(item.price) ?? "Contact us";
      return name && description ? { name, description, price } : undefined;
    }),
    plans: pickItems(data.plans, (item) => {
      const name = pickString(item.name);
      const price = pickString(item.price);
      const period = pickString(item.period) ?? "";
      const features = pickStringArray(item.features) ?? [];
      return name && price ? { name, price, period, features } : undefined;
    }),
    faq: pickItems(data.faq, (item) => {
      const question = pickString(item.question);
      const answer = pickString(item.answer);
      return question && answer ? { question, answer } : undefined;
    }),
    blogPosts: pickItems(data.blogPosts, (item) => {
      const title = pickString(item.title);
      const excerpt = pickString(item.excerpt);
      return title && excerpt ? { title, excerpt } : undefined;
    })
  };
}

function mergeOverrides(base: SiteContent, overrides: ContentOverrides | null): SiteContent {
  if (!overrides) return base;

  const merged: SiteContent = JSON.parse(JSON.stringify(base)) as SiteContent;

  if (overrides.headline) merged.home.headline = overrides.headline;
  if (overrides.subheadline) merged.home.subheadline = overrides.subheadline;
  if (overrides.features) merged.home.features = overrides.features.slice(0, 3);
  if (overrides.testimonials) merged.home.testimonials = overrides.testimonials.slice(0, 3);

  if (overrides.aboutIntro) merged.about.intro = overrides.aboutIntro;
  if (overrides.aboutBody) merged.about.body = overrides.aboutBody;
  if (overrides.values) merged.about.values = overrides.values.slice(0, 4);

  if (overrides.servicesIntro) merged.services.intro = overrides.servicesIntro;
  if (overrides.services) merged.services.items = overrides.services.slice(0, 6);

  if (overrides.productsIntro) merged.products.intro = overrides.productsIntro;
  if (overrides.products) merged.products.items = overrides.products.slice(0, 6);

  if (overrides.pricingIntro) merged.pricing.intro = overrides.pricingIntro;
  if (overrides.plans) {
    merged.pricing.plans = overrides.plans.slice(0, 4).map((plan, index) => ({
      ...plan,
      highlighted: index === 1
    }));
  }

  if (overrides.faqIntro) merged.faq.intro = overrides.faqIntro;
  if (overrides.faq) merged.faq.items = overrides.faq.slice(0, 8);

  if (overrides.blogIntro) merged.blog.intro = overrides.blogIntro;
  if (overrides.blogPosts) merged.blog.posts = overrides.blogPosts.slice(0, 6);

  if (overrides.contactIntro) merged.contact.intro = overrides.contactIntro;

  if (overrides.seoTitle) merged.seo.title = overrides.seoTitle;
  if (overrides.seoDescription) merged.seo.description = overrides.seoDescription;

  return merged;
}

const CONTENT_SYSTEM_PROMPT = `You are the Content Writer for a new website. Write copy for "{{projectName}}",
a {{businessType}} business ({{siteTypeLabel}}) targeting {{targetAudience}}, operated by the brand "{{brand}}".
Write in {{language}}. Return ONLY a single JSON object (no markdown fences, no commentary) with this shape:

{
  "headline": string (max 10 words),
  "subheadline": string (max 25 words),
  "aboutIntro": string (1 sentence),
  "aboutBody": string (2-3 sentences),
  "servicesIntro": string (1 sentence),
  "productsIntro": string (1 sentence),
  "pricingIntro": string (1 sentence),
  "faqIntro": string (1 sentence),
  "blogIntro": string (1 sentence),
  "contactIntro": string (1 sentence),
  "seoTitle": string (max 60 characters),
  "seoDescription": string (max 155 characters),
  "features": [{"title": string, "description": string}] (exactly 3),
  "testimonials": [{"quote": string, "author": string, "role": string}] (exactly 2),
  "values": [{"title": string, "description": string}] (exactly 3),
  "services": [{"title": string, "description": string}] (exactly 4),
  "products": [{"name": string, "description": string, "price": string}] (exactly 3),
  "plans": [{"name": string, "price": string, "period": string, "features": [string]}] (exactly 3),
  "faq": [{"question": string, "answer": string}] (exactly 5),
  "blogPosts": [{"title": string, "excerpt": string}] (exactly 3)
}`;

/**
 * Provider Layer(Requirement 6)를 재사용해 콘텐츠를 생성한다.
 * Prompt Engine(renderPromptTemplate)으로 변수 치환을 하고, ProviderManager.complete()
 * (runtime/executor.ts와 공유하는 동일한 헬퍼)로 실제 LLM을 호출한다.
 * 응답이 없거나 형식이 맞지 않으면 예외 없이 결정론적 기본값을 그대로 사용한다 —
 * AI 연결 여부와 무관하게 항상 빌드 가능한 프로젝트를 생성한다.
 */
export async function generateSiteContent(
  cwd: string,
  inputs: WebsiteInputs,
  providerId?: string
): Promise<{ content: SiteContent; simulated: boolean; provider?: string; model?: string }> {
  const defaults = buildDefaultContent(inputs);

  const systemPrompt = renderPromptTemplate(CONTENT_SYSTEM_PROMPT, {
    projectName: inputs.projectName,
    businessType: inputs.businessType,
    targetAudience: inputs.targetAudience,
    brand: inputs.brand,
    language: inputs.language,
    siteTypeLabel: SITE_TYPE_COPY[inputs.siteType].label
  });

  const manager = getProviderManager(cwd);
  const completion = await manager.complete({
    providerId,
    systemPrompt,
    userPrompt: "Write the website copy now. Return only the JSON object.",
    fallbackLabel: `Content Writer for "${inputs.projectName}"`
  });

  if (completion.simulated) {
    return { content: defaults, simulated: true };
  }

  const overrides = parseOverrides(completion.text);
  return {
    content: mergeOverrides(defaults, overrides),
    simulated: false,
    provider: completion.provider,
    model: completion.model
  };
}

