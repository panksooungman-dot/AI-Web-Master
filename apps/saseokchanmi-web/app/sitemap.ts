import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

const ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/menu", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/food", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/space", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/occasion", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/paju", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/review", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/location", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/reservation", priority: 0.9, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
