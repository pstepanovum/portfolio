// components/ValueCard.tsx (assuming you're using TypeScript)
import React from "react";

// Define prop types for ValueCard
interface ValueCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;  // This ensures `icon` is a React component (like an SVG or icon from an icon library)
  title: string;
  description: string;
}

// Define the ValueCard component with the typed props
const ValueCard: React.FC<ValueCardProps> = ({ icon: Icon, title, description }) => (
  <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.075] transition-all duration-300">
    <div className="relative w-12 h-12 mb-6">
      <div className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <h3 className="text-xl mb-2">{title}</h3>
    <p className="text-white/60 leading-relaxed">{description}</p>
  </div>
);

export default ValueCard;
