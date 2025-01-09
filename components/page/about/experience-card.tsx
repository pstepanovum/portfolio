import React from 'react';
import { Briefcase, MapPin, Clock } from 'lucide-react';

interface ExperienceCardProps {
  date: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  type?: string;
  achievements?: string[];
  tech?: string[];
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({
  date,
  title,
  company,
  description,
  location,
  type,
  achievements,
  tech,
}) => (
  <div className="relative pl-6 md:pl-8 pb-12 last:pb-0 group">
    {/* Timeline dot and line */}
    <div className="absolute left-0 top-0 w-px h-full bg-white/20 group-hover:bg-white/30 transition-colors duration-300">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-white/40 group-hover:bg-white/60 transition-colors duration-300" />
    </div>

    {/* Content */}
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/40">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-sm">{date}</span>
          </div>
          {type && (
            <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-medium">
              {type}
            </span>
          )}
        </div>
        
        <h3 className="text-lg md:text-xl font-medium text-white/90 group-hover:text-white transition-colors duration-300">
          {title}
        </h3>
        
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm md:text-base text-white/80">
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/40" />
            <span>{company}</span>
          </div>
          {location && (
            <>
              <span className="hidden md:inline text-white/40">•</span>
              <div className="flex items-center gap-1.5 w-full md:w-auto">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/40" />
                <span>{location}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm md:text-base text-white/60 leading-relaxed">{description}</p>

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/80">
            Key Achievements
          </h4>
          <ul className="space-y-2.5">
            {achievements.map((achievement, index) => (
              <li 
                key={index} 
                className="flex items-start gap-2.5 text-white/60"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2 
                              group-hover:bg-white/40 transition-colors duration-300" />
                <span className="text-sm md:text-base leading-relaxed">{achievement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technologies */}
      {tech && tech.length > 0 && (
        <div className="flex flex-wrap gap-1.5 md:gap-2 pt-1">
          {tech.map((item, index) => (
            <span 
              key={index} 
              className="px-2.5 py-1 text-xs md:text-sm bg-white/10 rounded-full text-white/70
                       group-hover:bg-white/[0.15] group-hover:text-white/80 transition-colors duration-300"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default ExperienceCard;