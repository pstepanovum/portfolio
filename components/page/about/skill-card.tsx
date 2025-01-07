// components/SkillCard.tsx (assuming you're using TypeScript)
interface SkillCardProps {
  category: string;           // category is a string
  skills: string[];           // skills is an array of strings
}

export const SkillCard: React.FC<SkillCardProps> = ({ category, skills }) => (
  <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.075] transition-all duration-300">
    <h3 className="text-lg mb-4">{category}</h3>
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, index) => (
        <span key={index} className="px-3 py-1 text-sm bg-white/10 rounded-full">
          {skill}
        </span>
      ))}
    </div>
  </div>
);

export default SkillCard;
