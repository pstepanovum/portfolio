import { 
  Award,
  ExternalLink,
  Clock,
  Copy,
} from 'lucide-react'
import Image from 'next/image'

interface CertificateCardProps {
  title: string
  issuer: string
  date: string
  credentialId?: string
  skills?: string
  logo?: string
}

const CertificateCard = ({ title, issuer, date, credentialId, skills, logo }: CertificateCardProps) => (
  <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/[0.075] transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-3">
        <div className="w-10 h-10 rounded-lg bg-white/10 p-2 backdrop-blur-sm">
          {logo ? (
            <Image 
              src={logo} 
              alt={`${issuer} logo`}
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          ) : (
            <Award className="w-full h-full text-white/60" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium group-hover:text-white transition-colors">
            {title}
          </h3>
          <p className="text-white/60 text-sm">{issuer}</p>
        </div>
      </div>
      <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-white" />
      </a>
    </div>
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <Clock className="w-4 h-4" />
        <span>{date}</span>
      </div>
      {credentialId && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-sm">
          <code className="text-white/60">ID: {credentialId}</code>
          <button className="hover:text-white/90 transition-colors" onClick={() => navigator.clipboard.writeText(credentialId)}>
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {skills && (
        <div className="space-y-2">
          <p className="text-sm text-white/80">Skills & Competencies:</p>
          <div className="flex flex-wrap gap-2">
            {skills.split(' · ').map((skill: string, index: number) => (
              <span 
                key={index}
                className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 
                         transition-colors cursor-default"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)

export default CertificateCard