import { LucideIcon } from 'lucide-react'

interface SkillCardProps {
 icon: LucideIcon
 title: string
 skills: string[]
 level: string[]
}

const SkillCard = ({ icon: Icon, title, skills, level }: SkillCardProps) => (
 <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.075] transition-all duration-300">
   <div className="relative w-12 h-12 mb-6">
     <div className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
     <div className="relative z-10 w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
       <Icon className="w-6 h-6 text-white" />
     </div>
   </div>
   <h3 className="text-xl mb-4">{title}</h3>
   <div className="space-y-3">
     {skills.map((skill, index) => (
       <div key={index} className="space-y-1">
         <div className="flex justify-between items-center">
           <span className="text-white/80">{skill}</span>
           <span className="text-sm text-white/60">{level[index]}</span>
         </div>
         <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
           <div 
             className="h-full bg-white rounded-full transition-all duration-500 group-hover:bg-white/80"
             style={{ width: level[index] }}
           />
         </div>
       </div>
     ))}
   </div>
 </div>
)

export default SkillCard