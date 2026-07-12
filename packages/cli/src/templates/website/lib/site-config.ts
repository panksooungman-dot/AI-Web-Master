export interface SiteConfig {
  projectName: string;
  projectSlug: string;
  siteType: string;
  siteTypeLabel: string;
  businessType: string;
  targetAudience: string;
  brand: string;
  language: string;
  languageCode: string;
  url: string;
  seoTitle: string;
  seoDescription: string;
  contactEmail: string;
}

const generatedConfig: SiteConfig = {{siteConfigJson}};

// NEXT_PUBLIC_SITE_URL (see .env.example) overrides the placeholder domain set at
// generation time — set it once you know the real production URL.
export const siteConfig: SiteConfig = {
  ...generatedConfig,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? generatedConfig.url
};

export interface NavItem {
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" }
];

export const legalLinks: NavItem[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" }
];
