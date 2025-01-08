'use client'

import { Sun } from 'lucide-react'
import { useState } from 'react'

export function ThemeToggle() {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(true)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
        aria-label="Theme toggle (disabled)"
      >
        <Sun className="w-5 h-5 text-white" />
      </button>
      
      {showTooltip && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-black/90 text-white text-sm rounded backdrop-blur-sm border border-white/20 whitespace-nowrap">
          Coming soon
          <div className="absolute top-[-6px] left-1/2 transform -translate-x-1/2 rotate-45 w-3 h-3 bg-black/90 border-l border-t border-white/20" />
        </div>
      )}
    </div>
  )
}