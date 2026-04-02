import type { MetadataRoute } from "next";
import { absoluteUrl, routeSeo } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return Object.values(routeSeo).map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    images: [absoluteUrl(route.image)],
  }));
}
