'use client'

import { Sun } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

export function ThemeToggle() {
  const [showTooltip, setShowTooltip] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  
  const hideTooltip = useCallback(() => {
    setIsLeaving(true)
    // After fade-out animation completes, hide tooltip
    setTimeout(() => {
      setShowTooltip(false)
      setIsLeaving(false)
    }, 200) // Match this with animation duration
  }, [])

  const handleInteraction = useCallback(() => {
    setIsLeaving(false)
    setShowTooltip(true)
    // Start hiding after 2 seconds
    setTimeout(hideTooltip, 2000)
  }, [hideTooltip])

  // Cleanup any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      setIsLeaving(false)
      setShowTooltip(false)
    }
  }, [])

  return (
    <div className="relative">
      <button
        onClick={handleInteraction}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 transition-colors hover:bg-white/15 active:bg-white/20"
        aria-label="Theme toggle (disabled)"
      >
        <Sun className="w-5 h-5 text-white" />
      </button>
      
      {showTooltip && (
        <div 
          className={`absolute top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-black/90 text-white text-sm rounded backdrop-blur-sm border border-white/20 whitespace-nowrap z-50 ${
            isLeaving ? 'animate-fade-out' : 'animate-fade-in'
          }`}
        >
          Coming soon
          <div className="absolute top-[-6px] left-1/2 transform -translate-x-1/2 rotate-45 w-3 h-3 bg-black/90 border-l border-t border-white/20" />
        </div>
      )}
    </div>
  )
}