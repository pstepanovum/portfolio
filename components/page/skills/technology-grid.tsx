import { ReactNode } from 'react'

interface Technology {
 icon: ReactNode
 name: string
}

interface TechnologyGridProps {
 title: string
 technologies: Technology[]
}

const TechnologyGrid = ({ title, technologies }: TechnologyGridProps) => (
 <div className="space-y-6">
   <h3 className="text-xl text-white/80">{title}</h3>
   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
     {technologies.map((tech, index) => (
       <div 
         key={index}
         className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300"
       >
         <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10">
           {tech.icon}
         </div>
         <span className="text-sm text-white/80">{tech.name}</span>
       </div>
     ))}
   </div>
 </div>
)

export default TechnologyGrid