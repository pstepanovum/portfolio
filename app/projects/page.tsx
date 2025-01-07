'use client'

import { Container } from '@/components/container'
import { 
  Code,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react' // Add this import
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { ProjectCard, ProjectModal } from '@/components/projects/modal' // Add this import

const CategorySection = ({ title, description, projects, onProjectClick }) => (
  <section className="py-24 relative">
    <Container>
      <div className="space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl">{title}</h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            {description}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <ProjectCard 
              key={index} 
              {...project} 
              onClick={() => onProjectClick(project)}
            />
          ))}
        </div>
      </div>
    </Container>
  </section>
)

export default function Projects() {
  // Add state for modal
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handler for project clicks
  const handleProjectClick = (project) => {
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const featuredProjects = [
    {
      image: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/16b9e0214501251.675941e8d964b.jpg",
      title: "AI-Powered Analytics Dashboard",
      description: "A real-time analytics platform using machine learning to provide predictive insights and data visualization.",
      tags: ["React", "Python", "TensorFlow", "AWS"],
      github: "https://github.com/pavlestepanov",
      demo: "https://demo.project.com"
    },
    {
      image: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/312d12170344647.645be123cec36.png",
      title: "E-Commerce Platform",
      description: "Full-stack e-commerce solution with real-time inventory, payment processing, and admin dashboard.",
      tags: ["Next.js", "Node.js", "MongoDB", "Stripe"],
      github: "https://github.com/pavlestepanov",
      demo: "https://demo.project.com"
    },
    {
      image: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/481f9d170344647.645be123cf865.png",
      title: "Social Media Analytics Tool",
      description: "Tool for analyzing social media engagement and generating comprehensive reports.",
      tags: ["React", "Python", "Django", "PostgreSQL"],
      github: "https://github.com/pavlestepanov",
      demo: "https://demo.project.com"
    }
  ]

  const webApps = [
    {
      image: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/481f9d170344647.645be123cf865.png",
      title: "Task Management System",
      description: "Collaborative project management tool with real-time updates and team features.",
      tags: ["Vue.js", "Express", "Socket.io"],
      github: "https://github.com/pavlestepanov",
      demo: "https://demo.project.com"
    }
  ]

  const aiProjects = [
    {
      image: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/14836d170344647.645be123cd568.png",
      title: "Image Recognition API",
      description: "Deep learning model for real-time image classification and object detection.",
      tags: ["Python", "PyTorch", "FastAPI", "Docker"],
      github: "https://github.com/pavlestepanov",
      demo: "https://demo.project.com"
    }
  ]

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        {/* Hero section */}
        <section 
          className="relative min-h-[60vh] flex items-center py-32 overflow-hidden"
          style={{
            backgroundImage: 'url("https://mir-s3-cdn-cf.behance.net/project_modules/max_1200_webp/a52fe2202313361.66842434792c5.gif")',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black" />
          
          <Container className="relative z-10 space-y-10">
            <div className="max-w-[64rem] space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                <Code className="w-4 h-4" />
                <span className="text-sm text-white/80">Latest Projects</span>
              </div>
              <h1 className="text-4xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
                Featured Work & Projects
              </h1>
              <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
                Explore my latest projects showcasing web development, AI solutions, and innovative applications.
              </p>
            </div>
          </Container>

          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </section>

        {/* Featured Projects */}
        <CategorySection 
          title="Featured Projects"
          description="Highlighted work showcasing my best projects and technical capabilities."
          projects={featuredProjects}
          onProjectClick={handleProjectClick}
        />

        {/* Web Applications */}
        <section className="py-24 relative bg-white/5">
          <CategorySection 
            title="Web Applications"
            description="Full-stack web applications built with modern technologies."
            projects={webApps}
            onProjectClick={handleProjectClick}
          />
        </section>

        {/* AI Projects */}
        <CategorySection 
          title="AI & Machine Learning"
          description="Projects focusing on artificial intelligence and machine learning solutions."
          projects={aiProjects}
          onProjectClick={handleProjectClick}
        />

        {/* CTA Section */}
        <section className="py-24 relative bg-white/5">
          <Container>
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl">Have a Project in Mind?</h2>
              <p className="text-white/60 text-lg">
                Let's collaborate and bring your ideas to life with cutting-edge technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <a 
                  href="/contact"
                  className="px-8 py-4 bg-white text-black rounded-xl hover:bg-white/90 transition-all duration-300"
                >
                  Start a Project
                </a>
                <a 
                  href="https://github.com/pavlestepanov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-8 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300 inline-flex items-center justify-center"
                >
                  View GitHub
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </Container>
        </section>

        {/* Modal */}
        <ProjectModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          project={selectedProject}
        />
      </main>
      <Footer />
    </>
  )
}