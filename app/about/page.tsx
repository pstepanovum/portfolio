"use client";

import { Container } from "@/components/container";
import ValueCard from "@/components/page/about/value-card";
import ExperienceCard from "@/components/page/about/experience-card";
import Image from "next/image";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import {
  values,
  skills,
  experience,
  CodeIcon,
  ArrowIcon,
} from "@/app/about/about-data";

export default function About() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        {/* Hero section */}
        <section
          className="relative min-h-[60vh] flex items-center py-32 overflow-hidden"
          style={{
            backgroundImage: 'url("/images/page/about/hero.gif")',
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black" />

          <Container className="relative z-10 space-y-10">
            <div className="max-w-[64rem] space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                {/* Custom Code Icon */}
                <CodeIcon className="w-4 h-4 text-white" />
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
        <section className="py-12 relative border-b border-white/10">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                    Academic & Technical Journey
                  </h2>
                  <div className="space-y-4">
                    <p className="text-white/80 text-lg leading-relaxed">
                      Currently pursuing both BS and MS degrees at the
                      University of Miami, I&apos;m cultivating expertise across
                      multiple technical domains. My academic focus spans
                      Cybersecurity, Artificial Intelligence, Machine Learning,
                      and Audio Engineering.
                    </p>
                    <p className="text-white/80 text-lg leading-relaxed">
                      As a full-stack developer, I blend security principles
                      with modern web development practices to create robust,
                      scalable applications. My unique combination of audio
                      engineering knowledge and AI expertise allows me to
                      approach problems from diverse perspectives.
                    </p>
                    <div className="pt-4">
                      <h3 className="text-xl font-semibold mb-3">
                        Core Competencies
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="flex items-center gap-2 text-white/70">
                            <ArrowIcon className="w-4 h-4 text-primary-500" />
                            Cybersecurity
                          </span>
                          <span className="flex items-center gap-2 text-white/70">
                            <ArrowIcon className="w-4 h-4 text-primary-500" />
                            AI/ML Development
                          </span>
                        </div>
                        <div className="space-y-2">
                          <span className="flex items-center gap-2 text-white/70">
                            <ArrowIcon className="w-4 h-4 text-primary-500" />
                            Web Development
                          </span>
                          <span className="flex items-center gap-2 text-white/70">
                            <ArrowIcon className="w-4 h-4 text-primary-500" />
                            Audio Engineering
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
                    src="/images/page/about/pic.webp"
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
        <section className="py-12 relative border-b border-white/10">
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
        <section className="py-12 relative border-b border-white/10">
          <Container>
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Technical Expertise
                </h2>
                <p className="text-white/80 text-lg max-w-2xl mx-auto">
                  Comprehensive skill set spanning cybersecurity, AI/ML,
                  development, and audio engineering.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {skills.map((category, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                  >
                    <h3 className="text-xl font-semibold mb-4">
                      {category.category}
                    </h3>
                    <ul className="space-y-2">
                      {category.skills.map((skill, skillIndex) => (
                        <li
                          key={skillIndex}
                          className="text-white/70 flex items-center gap-2"
                        >
                          {/* Replaced text arrow with ArrowIcon */}
                          <ArrowIcon className="w-4 h-4 text-primary-500" />
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
        <section className="py-12 relative border-b border-white/10">
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
