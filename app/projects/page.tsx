'use client'

import { Container } from '@/components/container'
import { 
  Code,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { ProjectModal } from '@/components/page/projects/modal'
import CategorySection from '@/components/page/projects/category-section-card'


export default function Projects() {
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handler for project clicks
  const handleProjectClick = (project) => {
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const featuredProjects = [
    {
      image: "/images/page/projects/feature-p1.png",
      title: "3D Voxel Engine with Advanced Block Physics",
      description: "A multiplayer voxel game engine featuring DDA raycasting, procedural terrain generation with biomes, and real-time block synchronization across clients.nd real-time block synchronization across clients.",
      tags: ["Three.js", "WebGL", "Socket.IO", "WebWorkers"],
      github: "https://github.com/pstepanovum/minecraft-classic",
      demo: "https://minecraft-classic-theta.vercel.app/"
    },
    {
      image: "/images/page/projects/book.png",
      title: "Health Haven Software - Medical Operations Technology Upgrade",
      description: "Comprehensive medical operations technology upgrade for Regal Atlantic Cruiselines featuring EHR system modernization, real-time emergency response, enhanced cybersecurity, and mobile/offline access capabilities.",
      tags: ["React.js", "Node.js", "PostgreSQL", "AWS", "CrowdStrike", "Apache Kafka"],
      demo: "/"
    },
    {
      image: "/images/page/projects/covid.png",
      title: "COVID-19 CT Image Analysis",
      description: "Deep learning system for COVID-19 detection from CT scans using ResNet and advanced visualization techniques. Achieves high accuracy through transfer learning and custom model implementations.",
      tags: ["PyTorch", "ResNet", "Transfer Learning", "GradCAM", "Medical AI"],
      github: "https://github.com/pstepanovum",
      demo: "/"
    }
  ]

  const webApps = [
    {
      image: "/images/page/projects/1.png",
      title: "Goldenrod: Cloud-Native Crypto Portfolio Platform",
      description: "A comprehensive cryptocurrency portfolio tracking application demonstrating full-stack DevOps implementation. Features include automated CI/CD pipelines with Jenkins, containerized microservices using Docker and Kubernetes, infrastructure as code with Terraform on AWS, and robust monitoring using Prometheus and Grafana. The platform handles real-time crypto data processing, automated testing, and zero-downtime deployments, showcasing modern DevOps practices and cloud-native architecture.",
      tags: ["Next.js", "AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "Prometheus", "Grafana", "CI/CD"],
      github: "https://github.com/pstepanovum",
      demo: "https://github.com/pstepanovum"
    }
  ];

  const aiProjects = [
    {
      image: "/images/page/projects/covid.png",
      title: "COVID-19 CT Image Analysis",
      description: "Deep learning system for COVID-19 detection from CT scans using ResNet and advanced visualization techniques. Achieves high accuracy through transfer learning and custom model implementations.",
      tags: ["PyTorch", "ResNet", "Transfer Learning", "GradCAM", "Medical AI"],
      github: "https://github.com/pstepanovum",
      demo: "/"
    },
    {
      image: "/images/page/projects/2.png",
      title: "Agario AI Game Engine",
      description: "Developed intelligent AI agents for a multiplayer blob game inspired by Agar.io. Implemented sophisticated behaviors including strategic blob movement, size-based pursuit/avoidance decisions, and automated splitting mechanics. Features real-time decision making and adaptive gameplay strategies.",
      tags: ["Neural Networks", "Reinforcement Learning", "Game AI", "JavaScript", "Node.js"],
      github: "https://github.com/pstepanovum/agar.io-clone",
      demo: "https://agar-io-clone-8std.vercel.app"
    },
    {
      image: "/images/page/projects/3.png",
      title: "Minecraft AI Hide & Seek (Upcoming)",
      description: "Designing an advanced AI system for NPCs in a Minecraft-style hide-and-seek game. Will feature intelligent pathfinding, strategic block manipulation, and cooperative team behaviors. NPCs will execute complex strategies like tree concealment, underground burrowing, and elevation tactics while maintaining efficient block inventory management.",
      tags: ["Reinforcement Learning", "Pathfinding Algorithms", "Game Theory", "JavaScript", "THREE.js"],
      github: "https://lucky-quokka-0a7.notion.site/Full-Stack-Development-001-1133d74755a8807aadd0fe1890d31aad?pvs=4",
      demo: "https://lucky-quokka-0a7.notion.site/Full-Stack-Development-001-1133d74755a8807aadd0fe1890d31aad?pvs=4"
    }
  ];

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
        <section className="py-8 relative border-b border-white/10">
          <CategorySection 
            title="Featured Projects"
            description="Highlighted work showcasing my best projects and technical capabilities."
            projects={featuredProjects}
            onProjectClick={handleProjectClick}
          />
        </section>

        {/* Web Applications */}
        <section className="py-8 relative border-b border-white/10">
          <CategorySection 
            title="Web Applications"
            description="Full-stack web applications built with modern technologies."
            projects={webApps}
            onProjectClick={handleProjectClick}
          />
        </section>

        {/* AI Projects */}
        <section className="py-8 relative border-b border-white/10">
          <CategorySection 
            title="AI & Machine Learning"
            description="Projects focusing on artificial intelligence and machine learning solutions."
            projects={aiProjects}
            onProjectClick={handleProjectClick}
          />
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <Container>
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl">Have a Project in Mind?</h2>
              <p className="text-white/60 text-lg">
                Let&apos;s collaborate and bring your ideas to life with cutting-edge technology.
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