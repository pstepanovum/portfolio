import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden font-mono">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />

        <div className="relative text-center space-y-8">
          <div className="space-y-2">
            <p className="text-white text-sm">ERROR_404</p>
            <h1 className="text-8xl font-bold text-white font-mono">404</h1>
            <p className="text-white/60 text-xl">page_not_found.exe</p>
          </div>

          <div className="space-y-6">
            <p className="text-white/60 text-lg">Process terminated unexpectedly</p>
            <Link 
              href="/"
              className="group px-8 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors inline-flex items-center justify-center"
            >
              <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
              return home
            </Link>
          </div>
        </div>
      </div>
    </Suspense>
  )
}