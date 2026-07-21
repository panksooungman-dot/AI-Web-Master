import type { MetadataRoute } from "next";

const SITE_URL = "https://cnbiz.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/services`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/portfolio`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
