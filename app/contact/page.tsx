'use client'

import { Container } from '@/components/container'
import ContactForm from '@/components/page/contact/contact-form-card'
import ResumeDownload from '@/components/page/contact/resume-download-card'
import { Suspense } from 'react'
import { 
  MessageSquare, 
} from 'lucide-react'

import Navbar from '@/components/navbar'
import Footer from '@/components/footer'


export default function Contact() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        <section 
          className="relative min-h-[60vh] flex items-center py-32 overflow-hidden"
          style={{
            backgroundImage: 'url("/images/page/contact/hero.png")',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black" />
          
          <Container className="relative z-10 space-y-10">
            <div className="max-w-[64rem] space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm text-white/80">
                  Get in Touch
                </span>
              </div>

              <h1 className="text-4xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
                Let&apos;s Work Together
              </h1>

              <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
                Have a project in mind? Let&apos;s discuss how we can bring your ideas to life.
              </p>
            </div>
          </Container>
        </section>

        <section className="py-24 relative">
          <Container>
            <div className="flex flex-col gap-16 max-w-3xl mx-auto">
              <div>
                <div className="space-y-4 mb-8">
                  <h2 className="text-2xl md:text-3xl">
                    Send a Message
                  </h2>
                  <p className="text-white/60">
                    Fill out the form below and I&apos;ll get back to you as soon as possible.
                  </p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                  <ContactForm />
                </div>
              </div>

              <div>
                <div className="space-y-4 mb-8">
                  <h2 className="text-2xl md:text-3xl">
                    Download Resume
                  </h2>
                  <p className="text-white/60">
                    Access my detailed resume with password protection. Contact me to get the password.
                  </p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                  <ResumeDownload />
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </Suspense>
  )
}