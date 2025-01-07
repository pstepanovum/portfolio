"use client";

import { Container } from "@/components/container";
import ValueCard from "@/components/page/about/value-card";
import ExperienceCard from "@/components/page/about/experience-card";
import Image from "next/image";
import {
  Code,
  Brain,
  Shield,
  Database,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";


export default function About() {
  const values = [
    {
      icon: Shield,
      title: "Security First",
      description: "Implementing robust security practices, vulnerability assessments, and data protection measures in every project.",
    },
    {
      icon: Code,
      title: "Technical Excellence",
      description: "Crafting scalable solutions using clean code principles, modern frameworks, and efficient algorithms.",
    },
    {
      icon: Brain,
      title: "AI Integration",
      description: "Leveraging machine learning and artificial intelligence to build intelligent, data-driven applications.",
    },
    {
      icon: Database,
      title: "Full Stack Mastery",
      description: "Building end-to-end applications with expertise in both frontend interfaces and backend systems.",
    },
  ];

  const skills = [
    {
      category: "Cybersecurity",
      skills: [
        "Penetration Testing",
        "Network Security",
        "Cryptography",
        "Secure Coding",
        "Threat Analysis",
        "Security Auditing"
      ],
    },
    {
      category: "AI & ML",
      skills: [
        "TensorFlow",
        "PyTorch",
        "Computer Vision",
        "NLP",
        "Deep Learning",
        "Neural Networks"
      ],
    },
    {
      category: "Full Stack Development",
      skills: [
        "React/Next.js",
        "Node.js/Express",
        "TypeScript",
        "PostgreSQL",
        "GraphQL",
        "AWS/Cloud"
      ],
    },
    {
      category: "Audio Engineering",
      skills: [
        "Digital Audio",
        "Sound Design",
        "Pro Tools",
        "Audio Processing",
        "Studio Equipment",
        "Mixing/Mastering"
      ],
    }
  ];

  const experience = [
    {
      date: "Fall 2023 - Fall 2024",
      title: "IT Services Specialist",
      company: "University of Miami Herbert Business School",
      location: "Miami, FL",
      description:
        "Led technical infrastructure improvements and automation initiatives in an educational environment. Focused on process optimization and team leadership.",
      achievements: [
        "Engineered automated solutions using Python and REST APIs, achieving 40% reduction in manual processes",
        "Implemented agile methodologies for system upgrade projects, managing sprints and deliverables",
        "Led and mentored cross-functional team of 3 specialists, establishing automation and testing best practices",
        "Maintained 95% user satisfaction rate through systematic problem-solving approaches",
      ],
      tech: ["Python", "REST APIs", "Agile", "Automation Testing"],
    },
    {
      date: "Oct 2022 - Jun 2023",
      title: "Software Developer",
      company: "The Current Newspaper",
      location: "Auburn, WA",
      description:
        "Developed and maintained web applications with focus on content management and API integrations.",
      achievements: [
        "Architected and implemented API integrations for content syndication, boosting workflow efficiency by 40%",
        "Collaborated in agile environment utilizing weekly sprints and peer code reviews",
        "Applied SDLC best practices in full-stack website redesign and feature implementation",
      ],
      tech: ["API Development", "SDLC", "Agile", "Full-Stack Development"],
    },
    {
      date: "Jun 2022 - Dec 2022",
      title: "Computer Technician",
      company: "Green River PC Repair Shop",
      location: "Auburn, WA",
      description:
        "Provided technical solutions and implemented content management systems for small businesses.",
      achievements: [
        "Developed and maintained content management solutions for small business websites",
        "Performed comprehensive hardware diagnostics and system repairs for 100+ clients",
        "Created and maintained technical documentation repository for procedures and solutions",
      ],
      tech: [
        "CMS",
        "Hardware Diagnostics",
        "Technical Documentation",
        "System Repair",
      ],
    },
    {
      date: "Jun 2022 - Aug 2022",
      title: "Technical Sales Specialist",
      company: "LA Fitness",
      location: "Auburn, WA",
      description:
        "Implemented technical solutions for sales and customer relationship management.",
      achievements: [
        "Developed automated tracking system using Excel and VBA for lead management",
        "Built and maintained CRM database system for 500+ members with data analytics",
        "Created automated email campaign system improving communication efficiency by 30%",
        "Implemented digital calendar integration for streamlined appointment booking",
      ],
      tech: [
        "Excel Analytics",
        "VBA",
        "CRM Systems",
        "Automation",
        "Data Analysis",
      ],
    },
    {
      date: "Feb 2021 - Jan 2022",
      title: "Web Developer & UI Designer",
      company: "Sports Contour",
      location: "Irkutsk, Russia",
      type: "Remote",
      description:
        "Full-stack web development and UI/UX design for sports equipment company.",
      achievements: [
        "Developed responsive website layouts and interfaces using modern web technologies",
        "Implemented UI/UX improvements resulting in enhanced user engagement",
        "Created design system and component library for consistent brand presentation",
        "Built interactive product catalogs with advanced filtering and search capabilities",
      ],
      tech: [
        "HTML/CSS",
        "JavaScript",
        "UI/UX Design",
        "Photoshop",
        "Zbrush",
        "Responsive Design",
      ],
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
            backgroundImage:
              'url("/images/page/about/hero.gif")',
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
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
                Full Stack Developer with a passion for building innovative
                solutions and creating impactful user experiences.
              </p>
            </div>
          </Container>
        </section>

        {/* About Section */}
        <section className="py-24 relative border-b border-white/10">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                    Academic & Technical Journey
                  </h2>
                  <div className="space-y-4">
                    <p className="text-white/80 text-lg leading-relaxed">
                      Currently pursuing both BS and MS degrees at the University of Miami, I&apos;m cultivating expertise across multiple technical domains. My academic focus spans Cybersecurity, Artificial Intelligence, Machine Learning, and Audio Engineering.
                    </p>
                    <p className="text-white/80 text-lg leading-relaxed">
                      As a full-stack developer, I blend security principles with modern web development practices to create robust, scalable applications. My unique combination of audio engineering knowledge and AI expertise allows me to approach problems from diverse perspectives.
                    </p>
                    <div className="pt-4">
                      <h3 className="text-xl font-semibold mb-3">Core Competencies</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="block text-white/70">
                            <span className="text-primary-500">→</span> Cybersecurity
                          </span>
                          <span className="block text-white/70">
                            <span className="text-primary-500">→</span> AI/ML Development
                          </span>
                        </div>
                        <div className="space-y-2">
                          <span className="block text-white/70">
                            <span className="text-primary-500">→</span> Web Development
                          </span>
                          <span className="block text-white/70">
                            <span className="text-primary-500">→</span> Audio Engineering
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  <Image
                    src="/images/page/about/photo.png"
                    alt="Profile Photo"
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Values Section */}
        
        <section className="py-24 relative border-b border-white/10">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">Development Philosophy</h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  The principles that guide my development process and work
                  ethic.
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
        <section className="py-24 relative border-b border-white/10">
          
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">Technical Expertise</h2>
                <p className="text-white/80 text-lg max-w-2xl mx-auto">
                  Comprehensive skill set spanning cybersecurity, AI/ML, development, and audio engineering.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {skills.map((category, index) => (
                  <div 
                    key={index}
                    className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                  >
                    <h3 className="text-xl font-semibold mb-4">{category.category}</h3>
                    <ul className="space-y-2">
                      {category.skills.map((skill, skillIndex) => (
                        <li 
                          key={skillIndex}
                          className="text-white/70 flex items-center gap-2"
                        >
                          <span className="text-primary-500">→</span>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Experience Section */}
        <section className="py-24 relative border-b border-white/10">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl">
                  Professional Experience
                </h2>
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
      </main>
      <Footer />
    </>
  );
}
