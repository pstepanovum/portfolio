import CertificationManager from "@/components/admin/certification-manager";
import { getCertifications } from "@/lib/firebase/portfolio";
import { requireAdminSession } from "@/lib/firebase/auth";

export default async function DashboardCertificationsPage() {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

  const certifications = await getCertifications();

  return <CertificationManager initialCertifications={certifications} />;
}
