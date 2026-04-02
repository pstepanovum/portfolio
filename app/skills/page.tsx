import SkillsPageClient from "@/app/skills/skills-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import { getCertifications } from "@/lib/firebase/portfolio";
import { buildPageMetadata, getPageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata("skills");
export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const certifications = await getCertifications();

  return (
    <>
      <JsonLd data={getPageJsonLd("skills")} />
      <SkillsPageClient certifications={certifications} />
    </>
  );
}
