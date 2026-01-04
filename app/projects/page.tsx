"use client";

import { Container } from "@/components/container";
import { useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ProjectModal } from "@/components/page/projects/modal";
import CategorySection from "@/components/page/projects/category-section-card";
import { Project } from "@/types/project";

// --- CUSTOM SVG ICONS ---
// Replace the d="" paths with your own SVG data

const CodeIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M29.4737 11.125L16.4737 4.12502C16.3281 4.04668 16.1654 4.00568 16 4.00568C15.8346 4.00568 15.6719 4.04668 15.5262 4.12502L2.52625 11.125C2.36801 11.2101 2.23564 11.3363 2.14303 11.4903C2.05043 11.6443 2.00102 11.8203 2 12V20C1.99989 20.1808 2.04877 20.3581 2.14143 20.5133C2.2341 20.6685 2.36708 20.7956 2.52625 20.8813L15.5262 27.8813C15.6719 27.9596 15.8346 28.0006 16 28.0006C16.1654 28.0006 16.3281 27.9596 16.4737 27.8813L29.4737 20.8813C29.6329 20.7956 29.7659 20.6685 29.8586 20.5133C29.9512 20.3581 30.0001 20.1808 30 20V12C29.999 11.8203 29.9496 11.6443 29.857 11.4903C29.7644 11.3363 29.632 11.2101 29.4737 11.125ZM28 18.3263L23.6812 16L28 13.6738V18.3263ZM21.5713 14.8638L17 12.4025V6.67377L26.8913 12L21.5713 14.8638ZM16 17.8638L12.5375 16L16 14.1363L19.4625 16L16 17.8638ZM15 6.67377V12.4025L10.4288 14.8638L5.10875 12L15 6.67377ZM4 13.6738L8.31875 16L4 18.3263V13.6738ZM10.4288 17.1363L15 19.5975V25.3263L5.10875 20L10.4288 17.1363ZM17 25.3263V19.5975L21.5713 17.1363L26.8913 20L17 25.3263Z"
      fill="currentColor"
    />
  </svg>
);

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

// ------------------------

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handler for project clicks
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const featuredProjects = [
    {
      image: "/images/page/projects/3d-plane-detection.png",
      title: "RANSAC Plane Segmentation with Temporal Tracking (CSC752)",
      description:
        "Developed multi-criteria plane classification system combining surface normals, height analysis, area estimation, and point density. Implemented temporal tracking with exponential smoothing (α=0.7) and label stability locking, processing 1,856 planes with 92.3% consistency at 30+ FPS on RGB-D data.",
      tags: [
        "ROS",
        "RANSAC",
        "Point Cloud Library",
        "Computer Vision",
        "Autonomous Navigation",
        "Python",
      ],
      demo: "https://github.com/pstepanovum/3d-plane-detection-for-robot-navigation",
    },
    {
      image: "/images/page/projects/brain-network.png",
      title:
        "fMRI Spectral Graph Signal Processing - Brain Connectivity Analysis",
      description:
        "Graph signal processing framework for analyzing fMRI brain networks and cognitive task classification. Achieved 67.1% accuracy using spectral decomposition with Random Forest, demonstrating interpretable frequency-domain analysis of neural connectivity patterns across motor, language, and working memory tasks.",
      tags: [
        "Python",
        "Graph Signal Processing",
        "Machine Learning",
        "Neuroimaging",
        "Scikit-learn",
        "NumPy/SciPy",
      ],
      demo: "https://github.com/pstepanovum/fMRI-Spectral-GSP",
    },
    {
      image: "/images/page/projects/hough-plane-detection.png",
      title: "Hough Transform Plane Detection for Robotic Navigation (ROS)",
      description:
        "Implemented enhanced D-KHT algorithm for real-time planar surface detection in 3D point clouds. Features O(1) statistical computations via Summed-Area Tables, PCA-based planarity validation, multi-projection analysis, and Isaac Sim integration. Achieves <50ms latency with Delaunay mesh reconstruction.",
      tags: [
        "ROS Noetic",
        "Computer Vision",
        "Python",
        "Point Cloud",
        "Isaac Sim",
        "LiDAR",
      ],
      demo: "https://github.com/pstepanovum/hough-plane-detection",
    },
    {
      image: "/images/page/projects/buildcomply.png",
      title: "BuildComply - AI Construction Compliance SaaS (CTO Role)",
      description:
        "Architected and built enterprise SaaS platform as CTO, featuring intelligent PDF processing pipeline, NLP-powered code compliance validation, and complete Stripe payment integration. Achieved 90%+ approval rate with <30min processing time and 99.9% uptime across 50+ jurisdictions.",
      tags: [
        "TypeScript",
        "AI/ML",
        "NLP",
        "Stripe Payments",
        "REST API",
        "Cloud Infrastructure",
      ],
      demo: "https://github.com/pstepanovum/buildcomply",
    },
    {
      image: "/images/page/projects/aml-detection.png",
      title: "AML Transaction Monitoring Database (ECE467 Database Systems)",
      description:
        "Comprehensive anti-money laundering detection system using HI-Small dataset. Features normalized 3NF schema, composite indexes for query optimization, 10 complex pattern detection algorithms (smurfing, layering, structuring), and specialized views for compliance officers and financial intelligence units.",
      tags: [
        "SQLite",
        "Database Design",
        "SQL",
        "Python",
        "Financial Analysis",
        "Pattern Detection",
      ],
      demo: "https://github.com/pstepanovum/ibm-transactions-for-anti-money-laundering-aml",
    },
    {
      image: "/images/page/projects/feature-p1.png",
      title: "3D Voxel Engine with Advanced Block Physics",
      description:
        "A multiplayer voxel game engine featuring DDA raycasting, procedural terrain generation with biomes, and real-time block synchronization across clients.nd real-time block synchronization across clients.",
      tags: ["Three.js", "WebGL", "Socket.IO", "WebWorkers"],
      github: "https://github.com/pstepanovum/minecraft-classic",
      demo: "https://minecraft-classic-theta.vercel.app/",
    },
    {
      image: "/images/page/projects/book.png",
      title: "Health Haven Software - Medical Operations Technology Upgrade",
      description:
        "Comprehensive medical operations technology upgrade for Regal Atlantic Cruiselines featuring EHR system modernization, real-time emergency response, enhanced cybersecurity, and mobile/offline access capabilities.",
      tags: [
        "React.js",
        "Node.js",
        "PostgreSQL",
        "AWS",
        "CrowdStrike",
        "Apache Kafka",
      ],
      demo: "/",
    },
    {
      image: "/images/page/projects/covid.png",
      title: "COVID-19 CT Image Analysis",
      description:
        "Deep learning system for COVID-19 detection from CT scans using ResNet and advanced visualization techniques. Achieves high accuracy through transfer learning and custom model implementations.",
      tags: ["PyTorch", "ResNet", "Transfer Learning", "GradCAM", "Medical AI"],
      github: "https://github.com/pstepanovum",
      demo: "/",
    },
  ];

  const webApps = [
    {
      image: "/images/page/projects/1.png",
      title: "Goldenrod: Cloud-Native Crypto Portfolio Platform",
      description:
        "A comprehensive cryptocurrency portfolio tracking application demonstrating full-stack DevOps implementation. Features include automated CI/CD pipelines with Jenkins, containerized microservices using Docker and Kubernetes, infrastructure as code with Terraform on AWS, and robust monitoring using Prometheus and Grafana. The platform handles real-time crypto data processing, automated testing, and zero-downtime deployments, showcasing modern DevOps practices and cloud-native architecture.",
      tags: [
        "Next.js",
        "AWS",
        "Docker",
        "Kubernetes",
        "Terraform",
        "Jenkins",
        "Prometheus",
        "Grafana",
        "CI/CD",
      ],
      github: "https://github.com/pstepanovum",
      demo: "https://github.com/pstepanovum",
    },
    {
      image: "/images/page/projects/resonateai.png",
      title: "ResonateAI DiffRhythm - Neural Music Generation Interface",
      description:
        "Full-stack AI music generation platform leveraging DiffRhythm diffusion model. Features React Query data fetching, Howler.js audio engine, Flask API with Librosa processing, and MuQ/MuQ-MuLan music representation. Enables lyrics-to-song generation with real-time progress and responsive audio controls.",
      tags: [
        "Next.js",
        "TypeScript",
        "Flask",
        "Diffusion Models",
        "Librosa",
        "React Query",
      ],
      demo: "https://github.com/pstepanovum/resonateAI",
    },
    {
      image: "/images/page/projects/therapy-ai.png",
      title: "TherapyAI: Mental Health Support Platform",
      description:
        "A comprehensive platform that helps therapists and patients stay present in every session—capturing conversations, revealing patterns and summarizing therapy sessions. Features include AI-generated session summaries, mindful journaling prompts, separate dashboards for patients and therapists, secure video sessions, and message management. Built with a focus on privacy and seamless multi-service integration.",
      tags: [
        "Next.js",
        "Firebase",
        "LiveKit",
        "AWS S3",
        "OpenAI API",
        "Whisper API",
        "GPT-4",
      ],
      github: "https://github.com/pstepanovum/therapyai",
      demo: "https://devpost.com/software/therapyai-4jl26m",
    },
    {
      image: "/images/page/projects/lokin.png",
      title: "Lokin - AI-Powered Student Startup Networking Platform",
      description:
        "First on-campus AI networking platform connecting students with startup opportunities. Built full-stack prototype featuring team matching algorithms, project management tools, and profile systems. Enables 500+ students across 5 universities to find co-founders, join startups, and build portfolio-ready experience.",
      tags: [
        "React",
        "Next.js",
        "TypeScript",
        "AI Matching",
        "Full-Stack",
        "Product Design",
      ],
      demo: "https://www.lokin.io/",
    },
  ];

  const aiProjects = [
    {
      image: "/images/page/projects/brain-network.png",
      title:
        "fMRI Spectral Graph Signal Processing - Brain Connectivity Analysis",
      description:
        "Graph signal processing framework for analyzing fMRI brain networks and cognitive task classification. Achieved 67.1% accuracy using spectral decomposition with Random Forest, demonstrating interpretable frequency-domain analysis of neural connectivity patterns across motor, language, and working memory tasks.",
      tags: [
        "Python",
        "Graph Signal Processing",
        "Machine Learning",
        "Neuroimaging",
        "Scikit-learn",
        "NumPy/SciPy",
      ],
      demo: "https://github.com/pstepanovum/fMRI-Spectral-GSP",
    },
    {
      image: "/images/page/projects/covid.png",
      title: "COVID-19 CT Image Analysis",
      description:
        "Deep learning system for COVID-19 detection from CT scans using ResNet and advanced visualization techniques. Achieves high accuracy through transfer learning and custom model implementations.",
      tags: ["PyTorch", "ResNet", "Transfer Learning", "GradCAM", "Medical AI"],
      github: "https://github.com/pstepanovum",
      demo: "/",
    },
    {
      image: "/images/page/projects/2.png",
      title: "Agario AI Game Engine",
      description:
        "Developed intelligent AI agents for a multiplayer blob game inspired by Agar.io. Implemented sophisticated behaviors including strategic blob movement, size-based pursuit/avoidance decisions, and automated splitting mechanics. Features real-time decision making and adaptive gameplay strategies.",
      tags: [
        "Neural Networks",
        "Reinforcement Learning",
        "Game AI",
        "JavaScript",
        "Node.js",
      ],
      github: "https://github.com/pstepanovum/agar.io-clone",
      demo: "https://agar-io-clone-8std.vercel.app",
    },
    {
      image: "/images/page/projects/3.png",
      title: "Minecraft AI Hide & Seek (Upcoming)",
      description:
        "Designing an advanced AI system for NPCs in a Minecraft-style hide-and-seek game. Will feature intelligent pathfinding, strategic block manipulation, and cooperative team behaviors. NPCs will execute complex strategies like tree concealment, underground burrowing, and elevation tactics while maintaining efficient block inventory management.",
      tags: [
        "Reinforcement Learning",
        "Pathfinding Algorithms",
        "Game Theory",
        "JavaScript",
        "THREE.js",
      ],
      github:
        "https://lucky-quokka-0a7.notion.site/Full-Stack-Development-001-1133d74755a8807aadd0fe1890d31aad?pvs=4",
      demo: "https://lucky-quokka-0a7.notion.site/Full-Stack-Development-001-1133d74755a8807aadd0fe1890d31aad?pvs=4",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        {/* Hero section */}
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                <CodeIcon className="w-4 h-4 text-white" />
                <span className="text-sm text-white/80">Latest Projects</span>
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
                Let&apos;s collaborate and bring your ideas to life with
                cutting-edge technology.
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
                  <ArrowRightIcon className="ml-2 w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
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
  );
}
