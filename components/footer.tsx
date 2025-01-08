import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/container';
import { 
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Code,
  Terminal,
  ArrowUpRight
} from 'lucide-react';
import { Suspense } from 'react'

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
    <Suspense fallback={<div>Loading...</div>}>
      <footer className="relative w-full bg-background dark:bg-black text-foreground dark:text-white border-t border-foreground/10 dark:border-white/10" role="contentinfo">
        <Container className="relative">
          <div className="py-12 lg:py-16">
            {/* Main footer content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
              {/* Brand section */}
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
                <nav aria-label="Social media links">
                  <ul className="flex flex-wrap gap-4">
                    {socialLinks.map(({ icon: Icon, href, label }) => (
                      <li key={label}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative w-10 h-10 flex items-center justify-center rounded-lg bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-foreground/50 dark:focus-visible:ring-white/50 focus-visible:outline-none"
                          aria-label={label}
                        >
                          <Icon 
                            className="w-5 h-5 relative z-10" 
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>

              {/* Links sections */}
              {footerLinks.map((section) => (
                <nav key={section.title} className="space-y-4" aria-label={section.title}>
                  <h2 className="text-sm text-foreground/80 dark:text-white/80">
                    {section.title}
                  </h2>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        {renderLink(link)}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>

            {/* Contact CTA */}
            <div className="relative mt-12 pt-12 border-t border-foreground/10 dark:border-white/10">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
                <div className="space-y-2">
                  <h2 className="text-xl text-foreground dark:text-white">
                    Start a project
                  </h2>
                  <p className="text-foreground/60 dark:text-white/60">
                    Interested in working together? Let&apos;s discuss your project.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="group inline-flex items-center px-6 py-3 bg-foreground dark:bg-white text-background dark:text-black rounded-lg hover:bg-foreground/90 dark:hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-foreground/50 dark:focus-visible:ring-white/50 focus-visible:outline-none"
                >
                  Let&apos;s Talk
                  <ArrowUpRight 
                    className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" 
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 pt-6 border-t border-foreground/10 dark:border-white/10">
              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between sm:items-center">
                <p className="text-sm text-foreground/60 dark:text-white/60 text-center sm:text-left">
                  © {new Date().getFullYear()} Pavel Stepanov. All rights reserved.
                </p>
                <div className="flex items-center justify-center sm:justify-end space-x-6">
                  <Code className="w-4 h-4 text-foreground/40 dark:text-white/40" aria-hidden="true" />
                  <span className="text-sm text-foreground/40 dark:text-white/40">
                    Built with Next.js & Tailwind CSS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </footer>
    </Suspense>
  );
};

export default Footer;