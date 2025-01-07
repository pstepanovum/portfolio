'use client'

import { useState } from 'react'
import { Container } from '@/components/container'
import { 
  MessageSquare, 
  MapPin, 
  Phone, 
  Mail, 
  Send,
  Download,
  Github,
  Linkedin,
  Lock,
  ArrowRight,
  FileText 
} from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

const ContactCard = ({ icon: Icon, title, content, link }) => (
  <a 
    href={link}
    target={link ? "_blank" : undefined}
    rel={link ? "noopener noreferrer" : undefined}
    className={`
      group backdrop-blur-xl bg-white/5 border border-white/10 
      rounded-2xl p-6 hover:bg-white/[0.075] transition-all duration-300
    `}
  >
    <div className="relative w-12 h-12 mb-6">
      <div 
        className={`
          absolute inset-0 bg-white/10 rounded-full blur-xl 
          opacity-0 group-hover:opacity-100 transition-opacity
        `} 
      />
      <div 
        className={`
          relative z-10 w-12 h-12 flex items-center justify-center 
          rounded-xl bg-white/5 border border-white/10
        `}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>

    <h3 className="text-xl mb-2">
      {title}
    </h3>

    <div className="text-white/60 leading-relaxed space-y-1">
      {Array.isArray(content) 
        ? content.map((item, index) => <p key={index}>{item}</p>)
        : <p>{content}</p>
      }
    </div>
  </a>
)

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    // Add form submission logic here
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const inputClasses = `
    w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 
    text-white placeholder:text-white/40 focus:outline-none 
    focus:ring-2 focus:ring-white/20
  `

  const labelClasses = "text-sm text-white/60"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="name" className={labelClasses}>
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={labelClasses}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Enter your email"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="subject" className={labelClasses}>
          Subject
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className={inputClasses}
          placeholder="What's this about?"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className={labelClasses}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={6}
          className={`${inputClasses} resize-none`}
          placeholder="Tell me about your project..."
          required
        />
      </div>

      <button 
        type="submit"
        className={`
          w-full px-8 py-4 bg-white text-black rounded-xl 
          hover:bg-white/90 transition-all 
          duration-300 flex items-center justify-center gap-2
        `}
      >
        <Send className="w-5 h-5" />
        Send Message
      </button>
    </form>
  )
}

const ResumeDownload = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleDownload = (e) => {
    e.preventDefault()
    if (password === '123') {
      window.open('/resume.pdf', '_blank')
      setError('')
      setPassword('')
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label 
          htmlFor="password" 
          className="text-sm text-white/60"
        >
          Enter Password
        </label>
        
        <div className="relative">
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            className={`
              w-full bg-white/5 border border-white/10 rounded-xl 
              px-4 py-3 text-white placeholder:text-white/40 
              focus:outline-none focus:ring-2 focus:ring-white/20
            `}
            placeholder="Enter password to download"
          />
          <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <button 
        onClick={handleDownload}
        className={`
          w-full px-8 py-4 bg-white/10 text-white rounded-xl 
          hover:bg-white/20 transition-all 
          duration-300 flex items-center justify-center gap-2
        `}
      >
        <FileText className="w-5 h-5" />
        Download Resume
      </button>
    </div>
  )
}

export default function Contact() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        <section 
          className="relative min-h-[60vh] flex items-center py-32 overflow-hidden"
          style={{
            backgroundImage: 'url("https://mir-s3-cdn-cf.behance.net/project_modules/max_3840_webp/b62ba4202313361.6684242f14db4.png")',
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
                Let's Work Together
              </h1>

              <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
                Have a project in mind? Let's discuss how we can bring your ideas to life.
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
                    Fill out the form below and I'll get back to you as soon as possible.
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
    </>
  )
}