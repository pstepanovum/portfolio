import { NextResponse, type NextRequest } from "next/server";
import {
  getCertifications,
  getDashboardSettings,
  getExperiences,
  getProjects,
} from "@/lib/firebase/portfolio";
import { requireLlmApiAuth } from "@/lib/llm-api";
import { siteConfig } from "@/lib/seo";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const unauthorized = await requireLlmApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const [projects, certifications, experiences, settings] = await Promise.all([
    getProjects(),
    getCertifications(),
    getExperiences(),
    getDashboardSettings(),
  ]);

  return NextResponse.json({
    site: {
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
    },
    counts: {
      projects: projects.length,
      certifications: certifications.length,
      experiences: experiences.length,
    },
    projects,
    certifications,
    experiences,
    resume: {
      available: Boolean(settings.resumeUrl),
      isPublic: settings.resumeIsPublic,
    },
  });
}
