import ContactPageClient from "@/app/contact/contact-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, getPageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata("contact");

export default function ContactPage() {
  return (
    <>
      <JsonLd data={getPageJsonLd("contact")} />
      <ContactPageClient />
    </>
  );
}
