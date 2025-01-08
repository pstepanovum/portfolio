import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/container';
import { TypewriterText } from '@/components/ui/typewritertext';
import { useEffect, useState, useRef } from 'react';
import { 
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Code,
  Terminal,
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  icon: React.ElementType;
  href: string;
  label: string;
}

const footerLinks: FooterSection[] = [
  {
    title: 'Navigation',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Projects', href: '/projects' },
      { label: 'Skills', href: '/skills' },
      { label: 'Contact', href: '/contact' }
    ]
  },
  {
    title: 'Projects',
    links: [
      { label: 'Featured Work', href: '/projects#featured' },
      { label: 'Web Apps', href: '/projects#web' },
      { label: 'Open Source', href: '/projects#opensource' },
      { label: 'Experiments', href: '/projects#experiments' }
    ]
  },
  {
    title: 'Connect',
    links: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hirepavelstepanov', external: true },
      { label: 'GitHub', href: 'https://github.com/pstepanovum', external: true },
      { label: 'Email', href: 'mailto:contact@pstepanov.work', external: true },
      { label: 'Resume', href: '/contact', external: true }
    ]
  }
];

const socialLinks: SocialLink[] = [
  { icon: Github, href: 'https://github.com/pstepanovum', label: 'GitHub Profile' },
  { icon: Linkedin, href: 'https://www.linkedin.com/in/hirepavelstepanov', label: 'LinkedIn Profile' },
  { icon: Mail, href: 'mailto:contact@pstepanov.work', label: 'Send Email' }
];

const Footer = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsLargeScreen(width >= 1024);
      
      if (width >= 1024) {
        setActiveSection(null);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSectionClick = (title: string) => {
    if (isLargeScreen) return;

    setActiveSection(prev => prev === title ? null : title);
    
    if (sectionRefs.current[title] && !isLargeScreen) {
      const yOffset = -20;
      const element = sectionRefs.current[title];
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  };

  const renderLink = (link: FooterLink) => {
    const Component = link.external ? 'a' : Link;
    const externalProps = link.external ? {
      target: "_blank",
      rel: "noopener noreferrer",
    } : {};

    return (
      <Component
        href={link.href}
        {...externalProps}
        className="group text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white inline-flex items-center"
      >
        {link.label}
        {link.external && (
          <ExternalLink 
            className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" 
            aria-hidden="true"
          />
        )}
      </Component>
    );
  };

  return (
    <footer className="relative w-full bg-background dark:bg-black text-foreground dark:text-white border-t border-foreground/10 dark:border-white/10" role="contentinfo">
      <Container className="relative">
        <div className="py-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-6">
              <Link href="/" className="inline-flex items-center space-x-2 group hover:opacity-90">
                <Terminal className="w-6 h-6 text-foreground dark:text-white" aria-hidden="true" />
                <div className="text-2xl text-foreground dark:text-white">
                  Pavel.dev
                </div>
              </Link>
              <p className="text-sm text-foreground/60 dark:text-white/60 max-w-xs leading-relaxed">
                Full-stack developer crafting beautiful, functional, and scalable web applications.
              </p>
              <nav aria-label="Social media links" className="flex flex-wrap gap-4">
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative w-10 h-10 flex items-center justify-center rounded-lg bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-foreground/50 dark:focus-visible:ring-white/50 focus-visible:outline-none"
                    aria-label={label}
                  >
                    <Icon className="w-5 h-5 relative z-10" aria-hidden="true" />
                  </a>
                ))}
              </nav>
            </div>

            <div className="col-span-1 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8">
              {footerLinks.map((section) => (
                <div 
                  key={section.title} 
                  className="space-y-4"
                  ref={(el: HTMLDivElement | null) => {
                    sectionRefs.current[section.title] = el;
                  }}
                >
                  <button
                    onClick={() => handleSectionClick(section.title)}
                    className="flex items-center justify-between w-full text-left lg:cursor-default lg:pointer-events-none"
                    aria-expanded={activeSection === section.title}
                  >
                    <h2 className="text-sm font-semibold text-foreground/80 dark:text-white/80">
                      {section.title}
                    </h2>
                    <ChevronDown 
                      className={`w-4 h-4 lg:hidden transition-transform duration-200 ease-in-out ${
                        activeSection === section.title ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <ul 
                    className={`space-y-3 overflow-hidden transition-all duration-200 ease-in-out ${
                      activeSection === section.title || isLargeScreen
                        ? 'max-h-96 opacity-100'
                        : 'max-h-0 opacity-0 lg:max-h-96 lg:opacity-100'
                    }`}
                  >
                    {section.links.map((link) => (
                      <li key={link.label}>
                        {renderLink(link)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-12 pt-8 border-t border-foreground/10 dark:border-white/10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
              <div className="space-y-2 flex-shrink">
                <h2 className="text-lg sm:text-xl text-foreground dark:text-white">
                  Start a project
                </h2>
                <p className="text-sm text-foreground/60 dark:text-white/60">
                  Interested in working together? Let&apos;s discuss your project.
                </p>
              </div>
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center whitespace-nowrap px-6 py-3 bg-foreground dark:bg-white text-background dark:text-black rounded-lg hover:bg-foreground/90 dark:hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-foreground/50 dark:focus-visible:ring-white/50 focus-visible:outline-none w-full md:w-auto min-w-[140px]"
              >
                Let&apos;s Talk
                <ArrowUpRight 
                  className="w-4 h-4 ml-2 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" 
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-foreground/10 dark:border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <p className="text-xs sm:text-sm text-foreground/60 dark:text-white/60 text-center sm:text-left order-2 sm:order-1">
                © {new Date().getFullYear()} Pavel Stepanov. All rights reserved.
              </p>
              <div className="flex items-center justify-center space-x-2 order-1 sm:order-2">
                <TypewriterText 
                  text="Built with Next.js & Tailwind CSS"
                  className="text-xs sm:text-sm text-foreground/40 dark:text-white/40"
                  typingSpeed={10}
                  scrambleLength={3}
                >
                  <Code className="w-4 h-4 text-foreground/40 dark:text-white/40 mr-2" aria-hidden="true" />
                </TypewriterText>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;