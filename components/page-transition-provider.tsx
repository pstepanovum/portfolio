'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import LoadingSpinner from '@/components/loading-spinner'
import { Router } from 'next/router'

export default function PageTransitionProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Add a small delay before showing the loader to prevent flashing on quick loads
    let loadingTimeout: NodeJS.Timeout

    const handleStart = () => {
      loadingTimeout = setTimeout(() => {
        setIsLoading(true)
      }, 100) // Delay showing the loader by 100ms
    }

    const handleStop = () => {
      clearTimeout(loadingTimeout)
      // Add a minimum display time to prevent flickering
      setTimeout(() => {
        setIsLoading(false)
      }, 200)
    }

    // Listen to Next.js route change events
    Router.events.on('routeChangeStart', handleStart)
    Router.events.on('routeChangeComplete', handleStop)
    Router.events.on('routeChangeError', handleStop)

    return () => {
      clearTimeout(loadingTimeout)
      Router.events.off('routeChangeStart', handleStart)
      Router.events.off('routeChangeComplete', handleStop)
      Router.events.off('routeChangeError', handleStop)
    }
  }, [])

  // Add fake loading on initial page load for better UX
  useEffect(() => {
    const initialLoadTimeout = setTimeout(() => {
      setIsLoading(false)
    }, 800) // Show loading for 800ms on initial page load

    return () => clearTimeout(initialLoadTimeout)
  }, [])

  // Reset loading state when route changes
  useEffect(() => {
    setIsLoading(false)
  }, [pathname, searchParams])

  return (
    <>
      {isLoading && <LoadingSpinner />}
      {children}
    </>
  )
}