import ExperienceManager from "@/components/admin/experience-manager";
import { getExperiences } from "@/lib/firebase/portfolio";

export default async function DashboardExperiencePage() {
  const experiences = await getExperiences();

  return <ExperienceManager initialExperiences={experiences} />;
}
