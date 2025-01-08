'use client'

import { useState } from 'react'
import { Lock, FileText } from 'lucide-react'

const ResumeDownload = () => {
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')

  // Type the event parameter for handleDownload
  const handleDownload = (e: React.MouseEvent<HTMLButtonElement>) => {
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
        <label htmlFor="password" className="text-sm text-white/60">
          Enter Password
        </label>

        <div className="relative">
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value)
              setError('') // Clear the error message when the user starts typing
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

export default ResumeDownload
