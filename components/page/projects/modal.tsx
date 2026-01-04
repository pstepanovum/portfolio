"use client";

import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Project } from "@/types/project";

// --- CUSTOM SVG ICONS ---
// Replace the d="" paths with your own SVG data

const GithubIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M26.0387 9.46C26.3444 8.474 26.4425 7.43535 26.3267 6.40957C26.211 5.38378 25.8839 4.3931 25.3662 3.5C25.2785 3.34795 25.1522 3.22169 25.0001 3.13392C24.8481 3.04615 24.6756 2.99996 24.5 3C23.3352 2.99756 22.186 3.26758 21.1442 3.78848C20.1024 4.30938 19.1969 5.06673 18.5 6H15.5C14.8031 5.06673 13.8976 4.30938 12.8558 3.78848C11.814 3.26758 10.6648 2.99756 9.5 3C9.32443 2.99996 9.15193 3.04615 8.99987 3.13392C8.84781 3.22169 8.72154 3.34795 8.63375 3.5C8.11606 4.3931 7.78903 5.38378 7.67329 6.40957C7.55754 7.43535 7.65559 8.474 7.96125 9.46C7.34341 10.5384 7.01245 11.7572 7 13V14C7.0021 15.692 7.61634 17.3261 8.72928 18.6006C9.84222 19.875 11.3787 20.7038 13.055 20.9338C12.3708 21.8093 11.9994 22.8888 12 24V25H9C8.20435 25 7.44129 24.6839 6.87868 24.1213C6.31607 23.5587 6 22.7957 6 22C6 21.3434 5.87067 20.6932 5.6194 20.0866C5.36812 19.48 4.99983 18.9288 4.53553 18.4645C4.07124 18.0002 3.52005 17.6319 2.91342 17.3806C2.30679 17.1293 1.65661 17 1 17C0.734784 17 0.48043 17.1054 0.292893 17.2929C0.105357 17.4804 0 17.7348 0 18C0 18.2652 0.105357 18.5196 0.292893 18.7071C0.48043 18.8946 0.734784 19 1 19C1.79565 19 2.55871 19.3161 3.12132 19.8787C3.68393 20.4413 4 21.2044 4 22C4 23.3261 4.52678 24.5979 5.46447 25.5355C6.40215 26.4732 7.67392 27 9 27H12V29C12 29.2652 12.1054 29.5196 12.2929 29.7071C12.4804 29.8946 12.7348 30 13 30C13.2652 30 13.5196 29.8946 13.7071 29.7071C13.8946 29.5196 14 29.2652 14 29V24C14 23.2044 14.3161 22.4413 14.8787 21.8787C15.4413 21.3161 16.2044 21 17 21C17.7956 21 18.5587 21.3161 19.1213 21.8787C19.6839 22.4413 20 23.2044 20 24V29C20 29.2652 20.1054 29.5196 20.2929 29.7071C20.4804 29.8946 20.7348 30 21 30C21.2652 30 21.5196 29.8946 21.7071 29.7071C21.8946 29.5196 22 29.2652 22 29V24C22.0006 22.8888 21.6292 21.8093 20.945 20.9338C22.6213 20.7038 24.1578 19.875 25.2707 18.6006C26.3837 17.3261 26.9979 15.692 27 14V13C26.9875 11.7572 26.6566 10.5384 26.0387 9.46ZM25 14C25 15.3261 24.4732 16.5979 23.5355 17.5355C22.5979 18.4732 21.3261 19 20 19H14C12.6739 19 11.4021 18.4732 10.4645 17.5355C9.52678 16.5979 9 15.3261 9 14V13C9.01226 12 9.31164 11.0247 9.8625 10.19C9.96519 10.0547 10.0317 9.89537 10.0558 9.72719C10.0798 9.559 10.0606 9.38746 10 9.22875C9.73953 8.557 9.61417 7.84045 9.63112 7.12016C9.64806 6.39988 9.80698 5.69001 10.0988 5.03125C10.9171 5.11929 11.7052 5.39039 12.4046 5.82447C13.104 6.25854 13.6966 6.84444 14.1388 7.53875C14.2288 7.67963 14.3528 7.79567 14.4994 7.87625C14.6459 7.95683 14.8103 7.99938 14.9775 8H19.0212C19.1891 8.00001 19.3543 7.95776 19.5015 7.87715C19.6487 7.79654 19.7733 7.68017 19.8638 7.53875C20.3058 6.84438 20.8985 6.25843 21.5978 5.82435C22.2972 5.39027 23.0853 5.1192 23.9037 5.03125C24.1951 5.69018 24.3536 6.40013 24.3701 7.12041C24.3866 7.8407 24.2609 8.55716 24 9.22875C23.9396 9.38595 23.9193 9.55574 23.9412 9.72274C23.963 9.88973 24.0262 10.0486 24.125 10.185C24.6813 11.0197 24.9851 11.997 25 13V14Z"
      fill="currentColor"
    />
  </svg>
);

const ExternalLinkIcon = ({
  className,
  ...props
}: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M10 15H22C22.2652 15 22.5196 15.1054 22.7071 15.2929C22.8946 15.4804 23 15.7348 23 16C23 16.2652 22.8946 16.5196 22.7071 16.7071C22.5196 16.8946 22.2652 17 22 17H10C9.73478 17 9.48043 16.8946 9.29289 16.7071C9.10536 16.5196 9 16.2652 9 16C9 15.7348 9.10536 15.4804 9.29289 15.2929C9.48043 15.1054 9.73478 15 10 15ZM13 21H8C6.67392 21 5.40215 20.4732 4.46447 19.5355C3.52678 18.5979 3 17.3261 3 16C3 14.6739 3.52678 13.4021 4.46447 12.4645C5.40215 11.5268 6.67392 11 8 11H13C13.2652 11 13.5196 10.8946 13.7071 10.7071C13.8946 10.5196 14 10.2652 14 10C14 9.73478 13.8946 9.48043 13.7071 9.29289C13.5196 9.10536 13.2652 9 13 9H8C6.14348 9 4.36301 9.7375 3.05025 11.0503C1.7375 12.363 1 14.1435 1 16C1 17.8565 1.7375 19.637 3.05025 20.9497C4.36301 22.2625 6.14348 23 8 23H13C13.2652 23 13.5196 22.8946 13.7071 22.7071C13.8946 22.5196 14 22.2652 14 22C14 21.7348 13.8946 21.4804 13.7071 21.2929C13.5196 21.1054 13.2652 21 13 21ZM24 9H19C18.7348 9 18.4804 9.10536 18.2929 9.29289C18.1054 9.48043 18 9.73478 18 10C18 10.2652 18.1054 10.5196 18.2929 10.7071C18.4804 10.8946 18.7348 11 19 11H24C25.3261 11 26.5979 11.5268 27.5355 12.4645C28.4732 13.4021 29 14.6739 29 16C29 17.3261 28.4732 18.5979 27.5355 19.5355C26.5979 20.4732 25.3261 21 24 21H19C18.7348 21 18.4804 21.1054 18.2929 21.2929C18.1054 21.4804 18 21.7348 18 22C18 22.2652 18.1054 22.5196 18.2929 22.7071C18.4804 22.8946 18.7348 23 19 23H24C25.8565 23 27.637 22.2625 28.9497 20.9497C30.2625 19.637 31 17.8565 31 16C31 14.1435 30.2625 12.363 28.9497 11.0503C27.637 9.7375 25.8565 9 24 9Z"
      fill="currentColor"
    />
  </svg>
);

const CloseIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Paste Close (X) SVG path here */}
    <path
      d="M8 8L24 24M24 8L8 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ------------------------

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="px-3 py-1 text-sm bg-white/10 rounded-full">{children}</span>
);

const ProjectLink = ({
  href,
  icon: Icon,
  children,
  className,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
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
);

export function ProjectModal({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}) {
  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none sm:max-w-5xl">
        <div className="relative bg-black/95 border border-white/10 rounded-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogClose
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors border border-white/10"
            aria-label="Close dialog"
          >
            <CloseIcon className="w-5 h-5 text-white" />
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
                  icon={GithubIcon}
                  className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-center justify-center"
                >
                  View Code
                </ProjectLink>
              )}
              {project.demo && (
                <ProjectLink
                  href={project.demo}
                  icon={ExternalLinkIcon}
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
  );
}

function truncateDescription(text: string, maxLength: number = 150) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
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
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const preventModalOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

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
              icon={GithubIcon}
              className="text-sm text-white/60 hover:text-white"
              onClick={preventModalOpen}
            >
              View Code
            </ProjectLink>
          )}
          {demo && (
            <ProjectLink
              href={demo}
              icon={ExternalLinkIcon}
              className="text-sm text-white/60 hover:text-white"
              onClick={preventModalOpen}
            >
              Live Demo
            </ProjectLink>
          )}
        </div>
      </div>
    </div>
  );
}
