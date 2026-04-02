import HomePageClient from "@/app/home-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, getHomePageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata("home");

export default function Home() {
  return (
    <>
      <JsonLd data={getHomePageJsonLd()} />
      <HomePageClient />
    </>
  );
}
