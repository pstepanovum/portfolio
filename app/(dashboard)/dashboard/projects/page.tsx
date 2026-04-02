import ProjectManager from "@/components/admin/project-manager";
import { getProjects } from "@/lib/firebase/portfolio";

export default async function DashboardProjectsPage() {
  const projects = await getProjects();

  return <ProjectManager initialProjects={projects} />;
}
