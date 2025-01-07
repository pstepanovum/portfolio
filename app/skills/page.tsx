'use client'

import { Container } from '@/components/container'
import { 
  Code,
  Database,
  Globe,
  Layers,
  Cloud,
  Terminal,
  Brain,
  Shield,
  ArrowRight,
  Wrench,
  Cpu,
  GitBranch,
  Monitor,
  Box,
  Figma as FigmaIcon,
  Layout,
  Award,
  ExternalLink,
  Clock,
  Copy,
} from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

const SkillCard = ({ icon: Icon, title, skills, level }) => (
  <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.075] transition-all duration-300">
    <div className="relative w-12 h-12 mb-6">
      <div className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <h3 className="text-xl mb-4">{title}</h3>
    <div className="space-y-3">
      {skills.map((skill, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-white/80">{skill}</span>
            <span className="text-sm text-white/60">{level[index]}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500 group-hover:bg-white/80"
              style={{ width: level[index] }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const TechnologyGrid = ({ title, technologies }) => (
  <div className="space-y-6">
    <h3 className="text-xl text-white/80">{title}</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {technologies.map((tech, index) => (
        <div 
          key={index}
          className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10">
            {tech.icon}
          </div>
          <span className="text-sm text-white/80">{tech.name}</span>
        </div>
      ))}
    </div>
  </div>
)

const CertificateCard = ({ title, issuer, date, credentialId, skills, logo }) => (
  <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/[0.075] transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-3">
        {/* Company Logo */}
        <div className="w-10 h-10 rounded-lg bg-white/10 p-2 backdrop-blur-sm">
          {logo ? (
            <img 
              src={logo} 
              alt={`${issuer} logo`}
              className="w-full h-full object-contain"
            />
          ) : (
            <Award className="w-full h-full text-white/60" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium group-hover:text-white transition-colors">
            {title}
          </h3>
          <p className="text-white/60 text-sm">{issuer}</p>
        </div>
      </div>
      <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-white" />
      </a>
    </div>
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <Clock className="w-4 h-4" />
        <span>{date}</span>
      </div>
      {credentialId && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-sm">
          <code className="text-white/60">ID: {credentialId}</code>
          <button className="hover:text-white/90 transition-colors" onClick={() => navigator.clipboard.writeText(credentialId)}>
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {skills && (
        <div className="space-y-2">
          <p className="text-sm text-white/80">Skills & Competencies:</p>
          <div className="flex flex-wrap gap-2">
            {skills.split(' · ').map((skill, index) => (
              <span 
                key={index}
                className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 
                         transition-colors cursor-default"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)

export default function Skills() {
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
      logo: "/api/placeholder/48/48"
    },
    {
      title: "Google Data Analytics Professional Certificate",
      issuer: "Google",
      date: "Issued Nov 2024",
      credentialId: "O0O4FBOY3YLD",
      skills: "Data analysis · SQL · R programming · Data visualization · Statistical analysis",
      logo: "/api/placeholder/48/48"
    },
    {
      title: "Campaign Manager 360",
      issuer: "Google",
      date: "Issued Sep 2024 · Expires Sep 2025",
      credentialId: "CM360-2024-09",
      skills: "Agency Planners · Trafficker · Campaign management · Digital advertising",
      logo: "/api/placeholder/48/48"
    },
    {
      title: "EF SET English Certificate",
      issuer: "EF SET",
      date: "Issued Sep 2024 · Expires Sep 2025",
      credentialId: "EFSET-2024-09",
      skills: "English proficiency · Business communication · Written comprehension · Verbal communication",
      logo: "/api/placeholder/48/48"
    },
    {
      title: "Google Analytics",
      issuer: "Google",
      date: "Issued Sep 2024 · Expires Sep 2025",
      credentialId: "e2a27c17-f734-4a4d-b1e2-b004b9108f11",
      skills: "Google Analytics 4 property setup · Data collection and analysis · Reporting tools utilization · Key measurement features · Website and app analytics",
      logo: "/api/placeholder/48/48"
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
            backgroundImage: 'url("https://mir-s3-cdn-cf.behance.net/project_modules/max_3840_webp/0385fb202313361.6684242f15499.png")',
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
        <section className="py-24 relative">
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
        <section className="py-24 relative bg-white/5">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                    <Award className="w-4 h-4" />
                    <span className="text-sm text-white/80">Certifications</span>
                  </div>
                </div>
                <h2 className="text-3xl md:text-4xl">Professional Certifications</h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  Industry recognized certifications and achievements.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {certificates.map((cert, index) => (
                  <CertificateCard key={index} {...cert} />
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Tools & Technologies Section */}
        <section className="py-24 relative">
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
              <h2 className="text-3xl md:text-4xl">Let's Build Something Together</h2>
              <p className="text-white/60 text-lg">
                Interested in collaborating? Let's discuss how my skills can help bring your ideas to life.
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
    </>
  )
}