'use client'

import { useState, useEffect } from 'react'
import { ThemeContext } from '@/context/theme-context'

type Theme = 'light' | 'dark'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const theme = getInitialTheme()
    updateTheme(theme)
    setMounted(true)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        updateTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(newTheme)
    try {
      localStorage.setItem('theme', newTheme)
    } catch (e) {
      console.error('Failed to save theme:', e)
    }
  }

  const getInitialTheme = (): Theme => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored) return stored as Theme
    } catch {}
    
    return window?.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light'
  }

  const toggleTheme = () => updateTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}