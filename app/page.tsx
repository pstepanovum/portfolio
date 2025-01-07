'use client'

// React and Next.js
import { useEffect, useState } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'

// Layout Components
import Navbar from '@/components/navbar'
import { Container } from '@/components/container'
import Footer from '@/components/footer'
import { motion } from 'framer-motion'

// Icons
import {
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react'

const Hero = () => {
  return (
    <section 
      className="relative min-h-screen flex items-center py-32 overflow-hidden "
      style={{
        backgroundImage: 'url("https://mir-s3-cdn-cf.behance.net/project_modules/max_3840/1b1b2f202313361.6684244919431.png")',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black" />
      
      <Container className="relative z-10 space-y-10">
        <div className="max-w-[64rem] space-y-6">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-white/80">
              Available for freelance projects
            </span>
          </motion.div>

          <h1 className="text-4xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Hi, I'm Pavel Stepanov
          </h1>
          <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
            Full Stack Developer and AI Engineer specializing in Machine Learning and Cybersecurity. Building innovative solutions for tomorrow's challenges.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link 
              href="/projects"
              className="px-8 py-4 bg-white text-black rounded-xl hover:bg-white/90 transition-colors text-center"
            >
              View Projects
            </Link>
            <Link 
              href="/contact"
              className="group px-8 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors inline-flex items-center justify-center"
            >
              Contact Me
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-6 pt-8">
            <a 
              href="https://github.com/yourusername" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              GitHub
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a 
              href="https://linkedin.com/in/yourusername" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              LinkedIn
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a 
              href="mailto:your.email@example.com"
              className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              Email
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
};

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="flex-1 flex flex-col bg-background text-foreground theme-transition">
        <Hero />
      </div>
      <Footer />
    </>
  )
}