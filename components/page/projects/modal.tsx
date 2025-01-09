'use client'

import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog'
import { Github, ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Project } from '@/types/project'

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="px-3 py-1 text-sm bg-white/10 rounded-full">
    {children}
  </span>
)

const ProjectLink = ({
  href,
  icon: Icon,
  children,
  className,
  onClick,
}: {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "inline-flex items-center gap-2 transition-colors",
      className
    )}
    onClick={onClick}
  >
    <Icon className="w-5 h-5" />
    {children}
  </a>
)

export function ProjectModal({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean
  onClose: () => void
  project: Project | null
}) {
  if (!project) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none sm:max-w-5xl">
        <div className="relative bg-black/95 border border-white/10 rounded-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogClose 
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors border border-white/10"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </DialogClose>

          <div className="relative aspect-video w-full">
            <Image
              src={project.image}
              alt={`${project.title} preview`}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
              quality={90}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <DialogTitle className="text-2xl md:text-3xl font-semibold">
              {project.title}
            </DialogTitle>

            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-base md:text-lg text-white/80 leading-relaxed">
                {project.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {project.github && (
                <ProjectLink
                  href={project.github}
                  icon={Github}
                  className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-center justify-center"
                >
                  View Code
                </ProjectLink>
              )}
              {project.demo && (
                <ProjectLink
                  href={project.demo}
                  icon={ExternalLink}
                  className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-center justify-center"
                >
                  Live Demo
                </ProjectLink>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function truncateDescription(text: string, maxLength: number = 150) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function ProjectCard({
  image,
  title,
  description,
  tags,
  github,
  demo,
  onClick,
}: Project & { onClick: () => void }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  const preventModalOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.075] transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${title}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={image}
          alt={`${title} preview`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      <div className="p-6 space-y-4">
        <h3 className="text-xl">{title}</h3>
        <p className="text-white/60 leading-relaxed h-[4.5rem] line-clamp-3">
          {truncateDescription(description)}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Tag key={index}>{tag}</Tag>
          ))}
        </div>

        <div className="flex gap-4 pt-4">
          {github && (
            <ProjectLink
              href={github}
              icon={Github}
              className="text-sm text-white/60 hover:text-white"
              onClick={preventModalOpen}
            >
              View Code
            </ProjectLink>
          )}
          {demo && (
            <ProjectLink
              href={demo}
              icon={ExternalLink}
              className="text-sm text-white/60 hover:text-white"
              onClick={preventModalOpen}
            >
              Live Demo
            </ProjectLink>
          )}
        </div>
      </div>
    </div>
  )
}