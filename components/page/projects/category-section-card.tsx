import { ProjectCard } from '@/components/page/projects/modal'
import { Container } from '@/components/container'

interface Project {
    image: string;
    title: string;
    description: string;
    tags: string[];
    github?: string;
    demo?: string;
}
  
interface CategorySectionProps {
    title: string;
    description: string;
    projects: Project[];
    onProjectClick: (project: Project) => void;
}
  
const CategorySection: React.FC<CategorySectionProps> = ({ title, description, projects, onProjectClick }) => (
    <section className="py-24 relative">
      <Container>
        <div className="space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl">{title}</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">{description}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <ProjectCard
                key={index}
                image={project.image}
                title={project.title}
                description={project.description}
                tags={project.tags}
                github={project.github}
                demo={project.demo}
                onClick={() => onProjectClick(project)}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
);
  
export default CategorySection;
  