'use client'

import { useState } from 'react'
import { Lock, FileText, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DownloadState {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
}

const ResumeDownload = () => {
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: 'idle',
    message: ''
  })
  const [attempts, setAttempts] = useState<number>(0)
  const MAX_ATTEMPTS = 3
  const COOLDOWN_TIME = 30000 // 30 seconds

  const handlePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const resetForm = () => {
    setPassword('')
    setShowPassword(false)
    setDownloadState({ status: 'idle', message: '' })
  }

  const isLocked = attempts >= MAX_ATTEMPTS

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (isLocked) {
      setDownloadState({
        status: 'error',
        message: `Too many attempts. Please try again in ${Math.ceil(COOLDOWN_TIME / 1000)} seconds.`
      })
      return
    }

    setDownloadState({ status: 'loading', message: 'Verifying password...' })

    try {
      // Simulate network request for password verification
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (password === process.env.NEXT_PUBLIC_RESUME_PASSWORD) {
        setDownloadState({
          status: 'success',
          message: 'Password correct! Downloading resume...'
        })
        
        // Download after showing success message
        setTimeout(() => {
          window.open('/resume.pdf', '_blank')
          resetForm()
          setAttempts(0)
        }, 1500)
      } else {
        const remainingAttempts = MAX_ATTEMPTS - (attempts + 1)
        setAttempts(prev => prev + 1)
        
        setDownloadState({
          status: 'error',
          message: remainingAttempts > 0
            ? `Incorrect password. ${remainingAttempts} attempts remaining.`
            : 'Maximum attempts reached. Please try again later.'
        })

        if (remainingAttempts === 0) {
          setTimeout(() => {
            setAttempts(0)
            setDownloadState({ status: 'idle', message: '' })
          }, COOLDOWN_TIME)
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setDownloadState({
        status: 'error',
        message: 'An error occurred. Please try again.'
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLocked) {
      handleDownload(e as unknown as React.MouseEvent<HTMLButtonElement>)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-white/60">
            Enter Password
          </label>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (downloadState.status === 'error') {
                  setDownloadState({ status: 'idle', message: '' })
                }
              }}
              onKeyPress={handleKeyPress}
              className={`
                w-full bg-white/5 border border-white/10 rounded-xl 
                px-4 py-3 pr-20 text-white placeholder:text-white/40 
                focus:outline-none focus:ring-2 focus:ring-white/20
                disabled:opacity-50 disabled:cursor-not-allowed
                ${downloadState.status === 'error' ? 'border-red-400/50' : ''}
              `}
              placeholder="Enter password to download"
              disabled={downloadState.status === 'loading' || isLocked}
              autoComplete="off"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasswordVisibility}
                className="p-1 hover:bg-white/10 rounded-md transition-colors"
                disabled={downloadState.status === 'loading' || isLocked}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-white/40" />
                ) : (
                  <Eye className="w-4 h-4 text-white/40" />
                )}
              </button>
              <Lock className="w-4 h-4 text-white/40" />
            </div>
          </div>

          {downloadState.status === 'error' && (
            <p className="text-red-400 text-sm flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {downloadState.message}
            </p>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={!password || downloadState.status === 'loading' || isLocked}
          className={`
            w-full px-8 py-4 bg-white/10 text-white rounded-xl 
            hover:bg-white/20 transition-all duration-300 
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${downloadState.status === 'loading' ? 'animate-pulse' : ''}
          `}
        >
          {downloadState.status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Download Resume
            </>
          )}
        </button>
      </div>

      <Dialog 
        open={downloadState.status === 'success'} 
        onOpenChange={() => {
          if (downloadState.status === 'success') {
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Success
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80">
            {downloadState.message}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ResumeDownload