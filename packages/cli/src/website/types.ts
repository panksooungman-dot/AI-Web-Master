/**
 * Website Builder v2 — 지원하는 사이트 타입 레지스트리.
 * `siteType`은 콘텐츠 어휘(content.ts)와 디자인 팔레트(아래 PALETTES)를 함께 결정한다.
 * 페이지 구성 자체는 타입과 무관하게 항상 동일한 11종을 생성한다(요구사항 2) —
 * 타입은 "어떤 페이지가 있는가"가 아니라 "어떻게 보이고 어떻게 말하는가"를 바꾼다.
 */
export const WEBSITE_TYPES = [
  "website",
  "landing",
  "portfolio",
  "corporate",
  "agency",
  "dental",
  "hospital",
  "restaurant",
  "shopping",
  "blog",
  "education"
] as const;

export type WebsiteType = (typeof WEBSITE_TYPES)[number];

export function isWebsiteType(value: string): value is WebsiteType {
  return (WEBSITE_TYPES as readonly string[]).includes(value);
}

export interface PaletteTokens {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

const NEUTRAL = {
  background: "#ffffff",
  foreground: "#0f172a",
  muted: "#f8fafc",
  border: "#e2e8f0",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626"
};

/** 타입별 Primary/Secondary/Accent — 나머지 중립 색상은 모든 타입이 공유한다. */
const BRAND_COLORS: Record<WebsiteType, { primary: string; primaryDark: string; secondary: string; accent: string }> = {
  website: { primary: "#2563eb", primaryDark: "#1d4ed8", secondary: "#0f172a", accent: "#38bdf8" },
  landing: { primary: "#7c3aed", primaryDark: "#6d28d9", secondary: "#111827", accent: "#f472b6" },
  portfolio: { primary: "#111827", primaryDark: "#000000", secondary: "#374151", accent: "#f59e0b" },
  corporate: { primary: "#1d4ed8", primaryDark: "#1e3a8a", secondary: "#0f172a", accent: "#64748b" },
  agency: { primary: "#db2777", primaryDark: "#9d174d", secondary: "#111827", accent: "#facc15" },
  dental: { primary: "#0ea5e9", primaryDark: "#0369a1", secondary: "#134e4a", accent: "#5eead4" },
  hospital: { primary: "#059669", primaryDark: "#065f46", secondary: "#0f172a", accent: "#34d399" },
  restaurant: { primary: "#dc2626", primaryDark: "#991b1b", secondary: "#78350f", accent: "#f59e0b" },
  shopping: { primary: "#9333ea", primaryDark: "#6b21a8", secondary: "#111827", accent: "#f43f5e" },
  blog: { primary: "#ea580c", primaryDark: "#c2410c", secondary: "#1e293b", accent: "#facc15" },
  education: { primary: "#4338ca", primaryDark: "#3730a3", secondary: "#0f172a", accent: "#fbbf24" }
};

export const PALETTES: Record<WebsiteType, PaletteTokens> = Object.fromEntries(
  WEBSITE_TYPES.map((type) => [type, { ...BRAND_COLORS[type], ...NEUTRAL }])
) as Record<WebsiteType, PaletteTokens>;

/** `ai website create`의 입력값 + 파생값(slug, 검증된 siteType)을 함께 담는 공용 타입.
 * website/content.ts·website/scaffold.ts·website/builder.ts가 이 하나의 타입을 공유한다. */
export interface WebsiteInputs {
  projectName: string;
  projectSlug: string;
  businessType: string;
  targetAudience: string;
  brand: string;
  language: string;
  siteType: WebsiteType;
}

export interface SiteTypeCopy {
  label: string;
  kicker: string;
  productNoun: string;
  pricingNoun: string;
  featureTitles: [string, string, string];
  serviceTitles: [string, string, string, string];
}

export const SITE_TYPE_COPY: Record<WebsiteType, SiteTypeCopy> = {
  website: {
    label: "General Website",
    kicker: "Welcome",
    productNoun: "Products",
    pricingNoun: "Plans",
    featureTitles: ["Reliable", "Easy to Use", "Built to Grow"],
    serviceTitles: ["Consulting", "Implementation", "Support", "Optimization"]
  },
  landing: {
    label: "Landing Page",
    kicker: "Introducing",
    productNoun: "Offers",
    pricingNoun: "Plans",
    featureTitles: ["Fast Setup", "Proven Results", "No Risk"],
    serviceTitles: ["Onboarding", "Launch", "Growth", "Support"]
  },
  portfolio: {
    label: "Portfolio",
    kicker: "Selected Work",
    productNoun: "Projects",
    pricingNoun: "Packages",
    featureTitles: ["Original Craft", "Detail-Driven", "On-Time Delivery"],
    serviceTitles: ["Design", "Development", "Branding", "Consulting"]
  },
  corporate: {
    label: "Corporate",
    kicker: "About Us",
    productNoun: "Solutions",
    pricingNoun: "Plans",
    featureTitles: ["Proven Track Record", "Enterprise-Grade", "Dedicated Team"],
    serviceTitles: ["Strategy", "Delivery", "Managed Services", "Advisory"]
  },
  agency: {
    label: "Agency",
    kicker: "Our Studio",
    productNoun: "Services",
    pricingNoun: "Packages",
    featureTitles: ["Creative Direction", "Data-Driven", "Full-Service Team"],
    serviceTitles: ["Branding", "Marketing", "Web & Product", "Content"]
  },
  dental: {
    label: "Dental Clinic",
    kicker: "Your Smile, Our Care",
    productNoun: "Treatments",
    pricingNoun: "Treatment Plans",
    featureTitles: ["Gentle Care", "Modern Equipment", "Experienced Dentists"],
    serviceTitles: ["General Dentistry", "Orthodontics", "Cosmetic Dentistry", "Implants"]
  },
  hospital: {
    label: "Hospital",
    kicker: "Trusted Healthcare",
    productNoun: "Departments",
    pricingNoun: "Care Packages",
    featureTitles: ["Board-Certified Staff", "24/7 Emergency Care", "Patient-Centered"],
    serviceTitles: ["Outpatient Care", "Diagnostics", "Surgery", "Rehabilitation"]
  },
  restaurant: {
    label: "Restaurant",
    kicker: "Taste the Difference",
    productNoun: "Menu",
    pricingNoun: "Set Menus",
    featureTitles: ["Fresh Ingredients", "Signature Recipes", "Warm Hospitality"],
    serviceTitles: ["Dine-In", "Takeout", "Catering", "Private Events"]
  },
  shopping: {
    label: "Online Store",
    kicker: "New Arrivals",
    productNoun: "Products",
    pricingNoun: "Bundles",
    featureTitles: ["Free Shipping", "Easy Returns", "Secure Checkout"],
    serviceTitles: ["Curated Selection", "Fast Delivery", "Customer Care", "Loyalty Rewards"]
  },
  blog: {
    label: "Blog",
    kicker: "Latest Stories",
    productNoun: "Collections",
    pricingNoun: "Memberships",
    featureTitles: ["Fresh Perspectives", "In-Depth Writing", "Weekly Updates"],
    serviceTitles: ["Articles", "Guides", "Interviews", "Newsletter"]
  },
  education: {
    label: "Education",
    kicker: "Learn With Us",
    productNoun: "Courses",
    pricingNoun: "Tuition Plans",
    featureTitles: ["Expert Instructors", "Flexible Learning", "Real Outcomes"],
    serviceTitles: ["Courses", "Workshops", "Mentoring", "Certification"]
  }
};

export function siteTypeLabel(siteType: WebsiteType): string {
  return SITE_TYPE_COPY[siteType].label;
}
