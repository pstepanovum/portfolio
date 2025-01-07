'use client'

import { Container } from '@/components/container'
import { 
  Code,
  Briefcase,
  MapPin,
  Users,
  Brain,
  Rocket,
  ArrowRight,
  Clock
} from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

const ValueCard = ({ icon: Icon, title, description }) => (
  <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.075] transition-all duration-300">
    <div className="relative w-12 h-12 mb-6">
      <div className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <h3 className="text-xl mb-2">{title}</h3>
    <p className="text-white/60 leading-relaxed">{description}</p>
  </div>
)

const SkillCard = ({ category, skills }) => (
  <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.075] transition-all duration-300">
    <h3 className="text-lg mb-4">{category}</h3>
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, index) => (
        <span 
          key={index}
          className="px-3 py-1 text-sm bg-white/10 rounded-full"
        >
          {skill}
        </span>
      ))}
    </div>
  </div>
)

const ExperienceCard = ({ date, title, company, description, location, type, achievements, tech }) => (
  <div className="relative pl-8 pb-12 last:pb-0 group">
    {/* Timeline dot and line */}
    <div className="absolute left-0 top-0 w-px h-full bg-white/10">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/20 
                    group-hover:bg-white/40 transition-all duration-300" />
    </div>

    {/* Content */}
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Clock className="w-4 h-4" />
          <span>{date}</span>
          {type && (
            <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
              {type}
            </span>
          )}
        </div>
        <h3 className="text-xl group-hover:text-white/90 transition-colors duration-300">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-white/80">
          <Briefcase className="w-4 h-4 text-white/40" />
          <span>{company}</span>
          {location && (
            <>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-white/40" />
                {location}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-white/60 leading-relaxed">{description}</p>

      {/* Achievements */}
      {achievements && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white/80">Key Achievements</h4>
          <ul className="space-y-2">
            {achievements.map((achievement, index) => (
              <li key={index} className="flex items-start gap-2 text-white/60 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 
                              group-hover:bg-white/40 transition-colors duration-300" />
                <span>{achievement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technologies */}
      {tech && (
        <div className="flex flex-wrap gap-2 pt-2">
          {tech.map((item, index) => (
            <span 
              key={index}
              className="px-2 py-1 text-xs bg-white/10 rounded-full text-white/60
                       group-hover:bg-white/[0.15] transition-colors duration-300"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
)

export default function About() {
  const values = [
    {
      icon: Code,
      title: "Clean Code",
      description: "Writing maintainable, efficient, and well-documented code that stands the test of time."
    },
    {
      icon: Users,
      title: "User-Centric",
      description: "Creating intuitive interfaces and experiences that delight users and solve real problems."
    },
    {
      icon: Brain,
      title: "Continuous Learning",
      description: "Staying current with emerging technologies and best practices in software development."
    },
    {
      icon: Rocket,
      title: "Innovation",
      description: "Pushing boundaries and exploring new solutions to complex technical challenges."
    }
  ]

  const skills = [
    {
      category: "Frontend",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "Redux"]
    },
    {
      category: "Backend",
      skills: ["Node.js", "Python", "Django", "PostgreSQL", "MongoDB", "REST APIs"]
    },
    {
      category: "DevOps & Tools",
      skills: ["Docker", "AWS", "Git", "CI/CD", "Linux", "Nginx"]
    },
    {
      category: "AI & ML",
      skills: ["TensorFlow", "PyTorch", "OpenAI", "Computer Vision", "NLP"]
    }
  ]

  const experience = [
    {
      date: "Fall 2023 - Fall 2024",
      title: "IT Services Specialist",
      company: "University of Miami Herbert Business School",
      location: "Miami, FL",
      description: "Led technical infrastructure improvements and automation initiatives in an educational environment. Focused on process optimization and team leadership.",
      achievements: [
        "Engineered automated solutions using Python and REST APIs, achieving 40% reduction in manual processes",
        "Implemented agile methodologies for system upgrade projects, managing sprints and deliverables",
        "Led and mentored cross-functional team of 3 specialists, establishing automation and testing best practices",
        "Maintained 95% user satisfaction rate through systematic problem-solving approaches"
      ],
      tech: ["Python", "REST APIs", "Agile", "Automation Testing"]
    },
    {
      date: "Oct 2022 - Jun 2023",
      title: "Software Developer",
      company: "The Current Newspaper",
      location: "Auburn, WA",
      description: "Developed and maintained web applications with focus on content management and API integrations.",
      achievements: [
        "Architected and implemented API integrations for content syndication, boosting workflow efficiency by 40%",
        "Collaborated in agile environment utilizing weekly sprints and peer code reviews",
        "Applied SDLC best practices in full-stack website redesign and feature implementation"
      ],
      tech: ["API Development", "SDLC", "Agile", "Full-Stack Development"]
    },
    {
      date: "Jun 2022 - Dec 2022",
      title: "Computer Technician",
      company: "Green River PC Repair Shop",
      location: "Auburn, WA",
      description: "Provided technical solutions and implemented content management systems for small businesses.",
      achievements: [
        "Developed and maintained content management solutions for small business websites",
        "Performed comprehensive hardware diagnostics and system repairs for 100+ clients",
        "Created and maintained technical documentation repository for procedures and solutions"
      ],
      tech: ["CMS", "Hardware Diagnostics", "Technical Documentation", "System Repair"]
    },
    {
      date: "Jun 2022 - Aug 2022",
      title: "Technical Sales Specialist",
      company: "LA Fitness",
      location: "Auburn, WA",
      description: "Implemented technical solutions for sales and customer relationship management.",
      achievements: [
        "Developed automated tracking system using Excel and VBA for lead management",
        "Built and maintained CRM database system for 500+ members with data analytics",
        "Created automated email campaign system improving communication efficiency by 30%",
        "Implemented digital calendar integration for streamlined appointment booking"
      ],
      tech: ["Excel Analytics", "VBA", "CRM Systems", "Automation", "Data Analysis"]
    },
    {
      date: "Feb 2021 - Jan 2022",
      title: "Web Developer & UI Designer",
      company: "Sports Contour",
      location: "Irkutsk, Russia",
      type: "Remote",
      description: "Full-stack web development and UI/UX design for sports equipment company.",
      achievements: [
        "Developed responsive website layouts and interfaces using modern web technologies",
        "Implemented UI/UX improvements resulting in enhanced user engagement",
        "Created design system and component library for consistent brand presentation",
        "Built interactive product catalogs with advanced filtering and search capabilities"
      ],
      tech: ["HTML/CSS", "JavaScript", "UI/UX Design", "Photoshop", "Zbrush", "Responsive Design"]
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
            backgroundImage: 'url("https://mir-s3-cdn-cf.behance.net/project_modules/max_1200_webp/c6cabb202313361.6684243479b56.gif")',
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
                <span className="text-sm text-white/80">About Me</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white">
              Building Digital Futures
              </h1>
              <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
                Full Stack Developer with a passion for building innovative solutions and creating impactful user experiences.
              </p>
            </div>
          </Container>
        </section>

        {/* About Section */}
        <section className="py-24 relative">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <h2 className="text-3xl md:text-4xl leading-tight">
                    My Journey
                  </h2>
                  <p className="text-white/60 text-lg leading-relaxed">
                    With over 5 years of experience in software development, I specialize in building modern web applications and implementing AI solutions. My expertise spans across frontend and backend development, with a focus on creating scalable and user-friendly applications.
                  </p>
                  <p className="text-white/60 text-lg leading-relaxed">
                    I'm passionate about using technology to solve complex problems and create meaningful experiences. Whether it's crafting intuitive user interfaces or architecting robust backend systems, I bring creativity and technical excellence to every project.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  <img 
                    src="/images/profile.jpg"
                    alt="Pavle Stepanov"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Values Section */}
        <section className="py-24 relative">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">Development Philosophy</h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  The principles that guide my development process and work ethic.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((value, index) => (
                  <ValueCard key={index} {...value} />
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Skills Section */}
        <section className="py-24 relative bg-white/5">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">Technical Skills</h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  Technologies and tools I work with to bring ideas to life.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {skills.map((skill, index) => (
                  <SkillCard key={index} {...skill} />
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Experience Section */}
        <section className="py-24 relative">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">Professional Experience</h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  My journey in software development.
                </p>
              </div>
              <div className="max-w-3xl mx-auto">
                {experience.map((exp, index) => (
                  <ExperienceCard key={index} {...exp} />
                ))}
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
                Interested in collaborating? Let's discuss your next project.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <a 
                  href="/contact"
                  className="px-8 py-4 bg-white text-black rounded-xl hover:bg-white/90 transition-all duration-300"
                >
                  Get in Touch
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