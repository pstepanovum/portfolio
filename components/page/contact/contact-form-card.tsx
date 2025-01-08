'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

// Define the form data type
interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

const ContactForm = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  // Type the event parameter for handleSubmit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Add form submission logic here
  }

  // Type the event parameter for handleChange (it can be input or textarea)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

export default ContactForm;
