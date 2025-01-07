// components/theme-toggle.tsx
'use client'

import { useTheme } from '@/context/theme-context'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Add a mounted class to handle visibility
  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.add('mounted')
    }
  }, [mounted])

  if (!mounted) {
    return (
      <div className="w-9 h-9 bg-white/10 rounded-lg" aria-hidden="true" />
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <Sun 
        className={`absolute w-5 h-5 text-white transform transition-all duration-300 ${
          theme === 'dark' ? 'scale-0 rotate-90' : 'scale-100 rotate-0'
        }`}
      />
      <Moon 
        className={`absolute w-5 h-5 text-white transform transition-all duration-300 ${
          theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'
        }`}
      />
    </button>
  )
}