import ProjectsPageClient from "@/app/projects/projects-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import { getProjectsByCategory } from "@/lib/firebase/portfolio";
import { buildPageMetadata, getPageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata("projects");
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { featuredProjects, webApps, aiProjects } = await getProjectsByCategory();

  return (
    <>
      <JsonLd data={getPageJsonLd("projects")} />
      <ProjectsPageClient
        featuredProjects={featuredProjects}
        webApps={webApps}
        aiProjects={aiProjects}
      />
    </>
  );
}
