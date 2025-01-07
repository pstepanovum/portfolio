// components/providers/theme-provider.tsx
'use client'

import { useState, useEffect } from 'react'
import { ThemeContext } from '@/context/theme-context'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  // Initialize theme
  useEffect(() => {
    // Add a function to safely access localStorage
    const getStoredTheme = () => {
      try {
        return localStorage.getItem('theme')
      } catch {
        return null
      }
    }

    // Get initial theme
    const initialTheme = getStoredTheme() || 
      (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light')

    setTheme(initialTheme as 'light' | 'dark')
    document.documentElement.classList.add(initialTheme)
    setMounted(true)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!getStoredTheme()) {
        const newTheme = e.matches ? 'dark' : 'light'
        setTheme(newTheme)
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(newTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const value = {
    theme,
    setTheme: (newTheme: 'light' | 'dark') => {
      setTheme(newTheme)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newTheme)
      try {
        localStorage.setItem('theme', newTheme)
      } catch (e) {
        console.error('Failed to save theme preference:', e)
      }
    },
    toggleTheme: () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark'
      setTheme(newTheme)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newTheme)
      try {
        localStorage.setItem('theme', newTheme)
      } catch (e) {
        console.error('Failed to save theme preference:', e)
      }
    },
    mounted
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}