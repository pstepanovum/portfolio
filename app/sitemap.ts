import type { MetadataRoute } from "next";
import {
  getCertifications,
  getExperiences,
  getProjects,
} from "@/lib/firebase/portfolio";
import { absoluteUrl, routeSeo } from "@/lib/seo";

// Regenerated hourly rather than per request, so crawlers get real content
// dates without a Firestore read on every hit.
export const revalidate = 3600;

function latestDate(values: (string | undefined)[], fallback: Date) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));

  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : fallback;
}

/**
 * lastModified previously reported the build time for every page, which told
 * crawlers the whole site changed on each deploy. These are the real dates the
 * underlying content last moved.
 */
async function getContentDates(fallback: Date) {
  const [projects, certifications, experiences] = await Promise.all([
    getProjects(),
    getCertifications(),
    getExperiences(),
  ]);

  const projectsUpdated = latestDate(
    projects.map((item) => item.updatedAt ?? item.createdAt),
    fallback,
  );
  const skillsUpdated = latestDate(
    certifications.map((item) => item.updatedAt ?? item.createdAt),
    fallback,
  );
  const aboutUpdated = latestDate(
    experiences.map((item) => item.updatedAt ?? item.createdAt),
    fallback,
  );

  return {
    home: new Date(
      Math.max(
        projectsUpdated.getTime(),
        skillsUpdated.getTime(),
        aboutUpdated.getTime(),
      ),
    ),
    about: aboutUpdated,
    projects: projectsUpdated,
    skills: skillsUpdated,
    contact: fallback,
  } satisfies Record<keyof typeof routeSeo, Date>;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fallback = new Date();
  let lastModified: Record<string, Date>;

  try {
    lastModified = await getContentDates(fallback);
  } catch {
    // A sitemap that still lists every URL beats one that fails to build.
    lastModified = {};
  }

  return Object.entries(routeSeo).map(([key, route]) => ({
    url: absoluteUrl(route.path),
    lastModified: lastModified[key] ?? fallback,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    images: [absoluteUrl(route.image)],
  }));
}
