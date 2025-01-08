import React from 'react';
import { Briefcase, MapPin, Clock } from 'lucide-react';

// Define the prop types for ExperienceCard
interface ExperienceCardProps {
  date: string;
  title: string;
  company: string;
  description: string;
  location?: string; // Optional string
  type?: string; // Optional string
  achievements?: string[]; // Optional array of strings
  tech?: string[]; // Optional array of strings
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
  <div className="relative pl-8 pb-12 last:pb-0 group">
    {/* Timeline dot and line */}
    <div className="absolute left-0 top-0 w-px h-full bg-white/100">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/100" />
    </div>

    {/* Content */}
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Clock className="w-4 h-4" />
          <span>{date}</span>
          {type && (
            <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
              {type}
            </span>
          )}
        </div>
        <h3 className="text-xl group-hover:text-white/90 transition-colors duration-300">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-white/80">
          <Briefcase className="w-4 h-4 text-white/40" />
          <span>{company}</span>
          {location && (
            <>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-white/40" />
                {location}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-white/60 leading-relaxed">{description}</p>

      {/* Achievements */}
      {achievements && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white/80">
            Key Achievements
          </h4>
          <ul className="space-y-2">
            {achievements.map((achievement, index) => (
              <li key={index} className="flex items-start gap-2 text-white/60 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 
                                group-hover:bg-white/40 transition-colors duration-300" />
                <span>{achievement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technologies */}
      {tech && (
        <div className="flex flex-wrap gap-2 pt-2">
          {tech.map((item, index) => (
            <span key={index} className="px-2 py-1 text-xs bg-white/10 rounded-full text-white/60
                                         group-hover:bg-white/[0.15] transition-colors duration-300">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default ExperienceCard;
