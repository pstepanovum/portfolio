'use client'

import { Container } from '@/components/container'
import SkillCard from '@/components/page/skills/skill-card'
import TechnologyGrid from '@/components/page/skills/technology-grid'
import CertificateCard from '@/components/page/skills/certificate-card'
import { Suspense } from 'react'

import { 
  Code,
  Database,
  Terminal,
  Brain,
  Shield,
  ArrowRight,
  Cpu,
  GitBranch,
  Monitor,
  Box,
  Figma as FigmaIcon,
  Layout,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { useRef, useState } from 'react'


export default function Skills() {
  const [visibleCount, setVisibleCount] = useState(2);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const toggleView = () => {
    if (visibleCount === 2) {
      setVisibleCount(certificates.length);
    } else {
      setVisibleCount(2);
      sectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };



  const skillSets = [
    {
      icon: Code,
      title: "Frontend Development",
      skills: ["React", "Next.js", "TypeScript", "CSS/SASS"],
      level: ["95%", "90%", "85%", "90%"]
    },
    {
      icon: Database,
      title: "Backend Development",
      skills: ["Node.js", "Python", "PostgreSQL", "MongoDB"],
      level: ["85%", "90%", "80%", "85%"]
    },
    {
      icon: Brain,
      title: "AI & Machine Learning",
      skills: ["TensorFlow", "PyTorch", "Computer Vision", "NLP"],
      level: ["80%", "75%", "85%", "80%"]
    },
    {
      icon: Shield,
      title: "DevOps & Security",
      skills: ["Docker", "AWS", "CI/CD", "Cybersecurity"],
      level: ["85%", "80%", "85%", "75%"]
    }
  ]

  const tools = [
    { icon: <Monitor className="w-4 h-4 text-white" />, name: "VS Code" },
    { icon: <GitBranch className="w-4 h-4 text-white" />, name: "Git" },
    { icon: <Box className="w-4 h-4 text-white" />, name: "Docker" },
    { icon: <Shield className="w-4 h-4 text-white" />, name: "Nginx" },
    { icon: <Cpu className="w-4 h-4 text-white" />, name: "Postman" },
    { icon: <FigmaIcon className="w-4 h-4 text-white" />, name: "Figma" },
    { icon: <Layout className="w-4 h-4 text-white" />, name: "Jira" },
    { icon: <Terminal className="w-4 h-4 text-white" />, name: "Linux" }
  ]

  const certificates = [
    {
      title: "Foundations of Cybersecurity",
      issuer: "Google",
      date: "Issued Jan 2025",
      credentialId: "6HK4U0WAXGNS",
      skills: "Cybersecurity fundamentals · Security protocols · Risk management · Network security",
      logo: "/images/page/skills/certificates/google.png"
    },
    {
      title: "Google Data Analytics Professional Certificate",
      issuer: "Google",
      date: "Issued Nov 2024",
      credentialId: "O0O4FBOY3YLD",
      skills: "Data analysis · SQL · R programming · Data visualization · Statistical analysis",
      logo: "/images/page/skills/certificates/google.png"
    },
    {
      title: "Campaign Manager 360",
      issuer: "Google",
      date: "Issued Sep 2024 · Expires Sep 2025",
      credentialId: "CM360-2024-09",
      skills: "Agency Planners · Trafficker · Campaign management · Digital advertising",
      logo: "/images/page/skills/certificates/google.png"
    },
    {
      title: "EF SET English Certificate",
      issuer: "EF SET",
      date: "Issued Sep 2024 · Expires Sep 2025",
      credentialId: "EFSET-2024-09",
      skills: "English proficiency · Business communication · Written comprehension · Verbal communication",
      logo: "/images/page/skills/certificates/ef.png"
    },
    {
      title: "Google Analytics",
      issuer: "Google",
      date: "Issued Sep 2024 · Expires Sep 2025",
      credentialId: "e2a27c17-f734-4a4d-b1e2-b004b9108f11",
      skills: "Google Analytics 4 property setup · Data collection and analysis · Reporting tools utilization · Key measurement features · Website and app analytics",
      logo: "/images/page/skills/certificates/google.png"
    }
  ];
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        {/* Hero section */}
        <section 
          className="relative min-h-[60vh] flex items-center py-32 overflow-hidden"
          style={{
            backgroundImage: 'url("/images/page/skills/hero.webp")',
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
                <span className="text-sm text-white/80">Technical Expertise</span>
              </div>
              <h1 className="text-4xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
                Skills & Technologies
              </h1>
              <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
                A comprehensive overview of my technical skills, tools, and expertise in software development.
              </p>
            </div>
          </Container>
        </section>

        {/* Core Skills Section */}
        <section className="py-24 relative border-b border-white/10">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">Core Skills</h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  Primary areas of expertise and technical proficiency.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {skillSets.map((skill, index) => (
                  <SkillCard key={index} {...skill} />
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Certificates Section */}
        <section ref={sectionRef} className="py-24 relative border-b border-white/10" id="certificates">
          <Container>
            <div className="space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">Professional Certifications</h2>
                <p className="text-white/60 text-lg">
                  Industry recognized certifications and achievements
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {certificates.slice(0, visibleCount).map((cert, index) => (
                  <CertificateCard key={index} {...cert} />
                ))}
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={toggleView}
                  className="px-6 py-2 rounded-lg border border-white/10 
                    hover:bg-white/5 transition-colors text-white/80 
                    hover:text-white flex items-center gap-2"
                >
                  {visibleCount === 2 ? (
                    <>Show More <ChevronDown className="w-4 h-4" /></>
                  ) : (
                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </Container>
        </section>

        {/* Tools & Technologies Section */}
        <section className="py-24 relative border-b border-white/10" id="tools">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">Tools & Technologies</h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  Software, frameworks, and tools I use in my development workflow.
                </p>
              </div>
              <div className="space-y-12">
                <TechnologyGrid 
                  title="Development Tools"
                  technologies={tools}
                />
              </div>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative bg-white/5">
          <Container>
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl">Let&apos;s Build Something Together</h2>
              <p className="text-white/60 text-lg">
                Interested in collaborating? Let&apos;s discuss how my skills can help bring your ideas to life.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <a 
                  href="/contact"
                  className="px-8 py-4 bg-white text-black rounded-xl hover:bg-white/90 transition-all duration-300"
                >
                  Start a Project
                </a>
                <a 
                  href="/projects"
                  className="group px-8 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300 inline-flex items-center justify-center"
                >
                  View Projects
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </Suspense>
  )
}