import AboutPageClient from "@/app/about/about-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import { getExperiences } from "@/lib/firebase/portfolio";
import { buildPageMetadata, getPageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata("about");
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const experiences = await getExperiences();

  return (
    <>
      <JsonLd data={getPageJsonLd("about")} />
      <AboutPageClient experiences={experiences} />
    </>
  );
}
