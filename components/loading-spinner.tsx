import React from 'react';

const LoadingSpinner = () => (
  <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm transition-all duration-300">
    <div className="flex h-full items-center justify-center">
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          {/* Outer ring */}
          <div className="absolute h-16 w-16 rounded-full border-4 border-foreground/20" />
          {/* Spinning inner ring */}
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
        </div>
        {/* Optional loading text */}
        <span className="text-sm text-foreground/60 animate-pulse">Loading...</span>
      </div>
    </div>
  </div>
);

export default LoadingSpinner;