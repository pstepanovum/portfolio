'use client'

import { useState } from 'react'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

interface FormState {
  status: 'idle' | 'submitting' | 'success' | 'error'
  message: string
}

const ContactForm = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const [formState, setFormState] = useState<FormState>({
    status: 'idle',
    message: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormState({ status: 'submitting', message: 'Sending your message...' })

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'form-name': 'contact',
          ...formData
        }).toString()
      })

      if (response.ok) {
        setFormState({
          status: 'success',
          message: "Message sent successfully! I'll get back to you soon."
        })
        resetForm()
      } else {
        throw new Error('Network response was not ok')
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setFormState({
        status: 'error',
        message: 'Sorry, there was a problem sending your message. Please try again.'
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const closeDialog = () => {
    if (formState.status === 'success') {
      setFormState({ status: 'idle', message: '' })
    } else if (formState.status === 'error') {
      setFormState({ status: 'idle', message: '' })
    }
  }

  const inputClasses = `
    w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 
    text-white placeholder:text-white/40 focus:outline-none 
    focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed
  `

  const labelClasses = "text-sm text-white/60"

  return (
    <>
      <form
        name="contact"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        onSubmit={handleSubmit}
        className="space-y-6"
        encType="application/x-www-form-urlencoded"
      >
        {/* Netlify required hidden input */}
        <input type="hidden" name="form-name" value="contact" />
        <div hidden>
          <input name="bot-field" />
        </div>

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
              disabled={formState.status === 'submitting'}
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
              disabled={formState.status === 'submitting'}
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
            disabled={formState.status === 'submitting'}
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
            disabled={formState.status === 'submitting'}
          />
        </div>

        <button 
          type="submit"
          disabled={formState.status === 'submitting'}
          className={`
            w-full px-8 py-4 bg-white text-black rounded-xl 
            hover:bg-white/90 transition-all duration-300 
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {formState.status === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Message
            </>
          )}
        </button>
      </form>

      <Dialog open={formState.status === 'success' || formState.status === 'error'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formState.status === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Message Sent
                </>
              ) : formState.status === 'error' ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Error
                </>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80">
            {formState.message}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ContactForm;