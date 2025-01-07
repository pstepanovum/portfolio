'use client'

import { 
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogClose
} from '@/components/ui/dialog'
import { Github, ExternalLink, X } from 'lucide-react'

const ProjectModal = ({ isOpen, onClose, project }) => {
  if (!project) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="relative bg-black/95 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Close button - Positioned over the image */}
          <DialogClose className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors border border-white/10">
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Image */}
          <div className="relative aspect-video w-full">
            <img 
              src={project.image} 
              alt={project.title}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            <h2 className="text-2xl md:text-3xl font-semibold">{project.title}</h2>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 text-sm bg-white/10 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Extended description */}
            <div className="space-y-4">
              <p className="text-lg text-white/80 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-4 pt-4">
              {project.github && (
                <a 
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Github className="w-5 h-5" />
                  View Code
                </a>
              )}
              {project.demo && (
                <a 
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Live Demo
                </a>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ProjectCard = ({ image, title, description, tags, github, demo, onClick }) => (
  <div 
    className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.075] transition-all duration-300 cursor-pointer"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onClick()
      }
    }}
  >
    <div className="relative aspect-[16/9] overflow-hidden">
      <img 
        src={image} 
        alt={title}
        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
    </div>
    <div className="p-6 space-y-4">
      <h3 className="text-xl">{title}</h3>
      <p className="text-white/60 leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span 
            key={index}
            className="px-3 py-1 text-sm bg-white/10 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex gap-4 pt-4">
        {github && (
          <a 
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            onClick={e => e.stopPropagation()} // Prevent modal from opening when clicking links
          >
            <Github className="w-4 h-4" />
            View Code
          </a>
        )}
        {demo && (
          <a 
            href={demo}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            onClick={e => e.stopPropagation()} // Prevent modal from opening when clicking links
          >
            <ExternalLink className="w-4 h-4" />
            Live Demo
          </a>
        )}
      </div>
    </div>
  </div>
)

export { ProjectModal, ProjectCard }