import CertificationManager from "@/components/admin/certification-manager";
import { getCertifications } from "@/lib/firebase/portfolio";

export default async function DashboardCertificationsPage() {
  const certifications = await getCertifications();

  return <CertificationManager initialCertifications={certifications} />;
}
