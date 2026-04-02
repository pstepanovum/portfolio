"use client";

import { useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Container } from "@/components/container";
import { ProjectModal } from "@/components/page/projects/modal";
import CategorySection from "@/components/page/projects/category-section-card";
import { Ticker } from "@/components/ui/ticker";
import type { PortfolioProject } from "@/types/content";

const ArrowRightIcon = ({
  className,
  ...props
}: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M27.7075 16.7076L18.7075 25.7076C18.5199 25.8952 18.2654 26.0006 18 26.0006C17.7346 26.0006 17.4801 25.8952 17.2925 25.7076C17.1049 25.5199 16.9994 25.2654 16.9994 25.0001C16.9994 24.7347 17.1049 24.4802 17.2925 24.2926L24.5863 17.0001H5C4.73478 17.0001 4.48043 16.8947 4.29289 16.7072C4.10536 16.5196 4 16.2653 4 16.0001C4 15.7349 4.10536 15.4805 4.29289 15.293C4.48043 15.1054 4.73478 15.0001 5 15.0001H24.5863L17.2925 7.70757C17.1049 7.51993 16.9994 7.26543 16.9994 7.00007C16.9994 6.7347 17.1049 6.48021 17.2925 6.29257C17.4801 6.10493 17.7346 5.99951 18 5.99951C18.2654 5.99951 18.5199 6.10493 18.7075 6.29257L27.7075 15.2926C27.8005 15.3854 27.8742 15.4957 27.9246 15.6171C27.9749 15.7385 28.0008 15.8687 28.0008 16.0001C28.0008 16.1315 27.9749 16.2616 27.9246 16.383C27.8742 16.5044 27.8005 16.6147 27.7075 16.7076Z"
      fill="currentColor"
    />
  </svg>
);

type ProjectsPageClientProps = {
  featuredProjects: PortfolioProject[];
  webApps: PortfolioProject[];
  aiProjects: PortfolioProject[];
};

export default function ProjectsPageClient({
  featuredProjects,
  webApps,
  aiProjects,
}: ProjectsPageClientProps) {
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: PortfolioProject) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        <section
          className="relative min-h-[60vh] flex items-center py-32 overflow-hidden"
          style={{
            backgroundImage: 'url("/images/page/projects/hero.gif")',
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black" />

          <Container className="relative z-10 space-y-10">
            <div className="max-w-[64rem] space-y-6">
              <div className="mb-4">
                <span className="text-sm text-white/80">[ LATEST PROJECTS ]</span>
              </div>
              <h1 className="text-4xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
                Featured Work & Projects
              </h1>
              <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
                Explore my latest projects showcasing web development, AI
                solutions, and innovative applications.
              </p>
            </div>
          </Container>

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </section>

        <Ticker text="/ 01000010 01001100 01000001 01000011 01001011 01010011 01001101 01001001 01010100 01001000" />

        <section id="featured-projects" className="py-8 relative border-b border-white/10">
          <CategorySection
            title="Featured Projects"
            description="Highlighted work showcasing my best projects and technical capabilities."
            projects={featuredProjects}
            onProjectClick={handleProjectClick}
          />
        </section>

        <section id="web-applications" className="py-8 relative border-b border-white/10">
          <CategorySection
            title="Web Applications"
            description="Full-stack web applications built with modern technologies."
            projects={webApps}
            onProjectClick={handleProjectClick}
          />
        </section>

        <section id="ai-projects" className="py-8 relative border-b border-white/10">
          <CategorySection
            title="AI & Machine Learning"
            description="Projects focusing on artificial intelligence and machine learning solutions."
            projects={aiProjects}
            onProjectClick={handleProjectClick}
          />
        </section>

        <section className="py-24 relative">
          <Container>
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl">Have a Project in Mind?</h2>
              <p className="text-white/60 text-lg">
                Let&apos;s collaborate and bring your ideas to life with
                cutting-edge technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <a
                  href="/contact"
                  className="px-8 py-4 bg-white text-black hover:bg-white/90 transition-all duration-300"
                >
                  Start a Project
                </a>
                <a
                  href="https://github.com/pstepanovum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-8 py-4 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 inline-flex items-center justify-center"
                >
                  View GitHub
                  <ArrowRightIcon className="ml-2 w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </Container>
        </section>

        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          project={selectedProject}
        />
      </main>
      <Footer />
    </>
  );
}
