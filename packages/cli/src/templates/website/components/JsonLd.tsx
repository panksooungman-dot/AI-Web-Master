import { siteConfig } from "@/lib/site-config";

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.projectName,
    url: siteConfig.url,
    description: siteConfig.seoDescription,
    email: siteConfig.contactEmail
  };

  const json = JSON.stringify(data);

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
