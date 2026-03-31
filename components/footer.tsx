import React from "react";
import Link from "next/link";
import { Container } from "@/components/container";
import { TypewriterText } from "@/components/ui/typewritertext";
import { Ticker } from "@/components/ui/ticker";
import { useEffect, useState, useRef } from "react";

// --- Custom SVG Components ---
// Replace d="" paths with your own if needed

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
      d="M26 6H16M26 6V16M26 6L14 18M6 10V26H22V20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CodeIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M10 8L2 16L10 24M22 8L30 16L22 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowUpRightIcon = ({
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
      d="M7 25L25 7M25 7H11M25 7V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronDownIcon = ({
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
      d="M6 12L16 22L26 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GithubIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M26.0387 9.46C26.3444 8.474 26.4425 7.43535 26.3267 6.40957C26.211 5.38378 25.8839 4.3931 25.3662 3.5C25.2785 3.34795 25.1522 3.22169 25.0001 3.13392C24.8481 3.04615 24.6756 2.99996 24.5 3C23.3352 2.99756 22.186 3.26758 21.1442 3.78848C20.1024 4.30938 19.1969 5.06673 18.5 6H15.5C14.8031 5.06673 13.8976 4.30938 12.8558 3.78848C11.814 3.26758 10.6648 2.99976 9.5 3C9.32443 2.99996 9.15193 3.04615 8.99987 3.13392C8.84781 3.22169 8.72154 3.34795 8.63375 3.5C8.11606 4.3931 7.78903 5.38378 7.67329 6.40957C7.55754 7.43535 7.65559 8.474 7.96125 9.46C7.34341 10.5384 7.01245 11.7572 7 13V14C7.0021 15.692 7.61634 17.3261 8.72928 18.6006C9.84222 19.875 11.3787 20.7038 13.055 20.9338C12.3708 21.8093 11.9994 22.8888 12 24V25H9C8.20435 25 7.44129 24.6839 6.87868 24.1213C6.31607 23.5587 6 22.7957 6 22C6 21.3434 5.87067 20.6932 5.6194 20.0866C5.36812 19.48 4.99983 18.9288 4.53553 18.4645C4.07124 18.0002 3.52005 17.6319 2.91342 17.3806C2.30679 17.1293 1.65661 17 1 17C0.734784 17 0.48043 17.1054 0.292893 17.2929C0.105357 17.4804 0 17.7348 0 18C0 18.2652 0.105357 18.5196 0.292893 18.7071C0.48043 18.8946 0.734784 19 1 19C1.79565 19 2.55871 19.3161 3.12132 19.8787C3.68393 20.4413 4 21.2044 4 22C4 23.3261 4.52678 24.5979 5.46447 25.5355C6.40215 26.4732 7.67392 27 9 27H12V29C12 29.2652 12.1054 29.5196 12.2929 29.7071C12.4804 29.8946 12.7348 30 13 30C13.2652 30 13.5196 29.8946 13.7071 29.7071C13.8946 29.5196 14 29.2652 14 29V24C14 23.2044 14.3161 22.4413 14.8787 21.8787C15.4413 21.3161 16.2044 21 17 21C17.7956 21 18.5587 21.3161 19.1213 21.8787C19.6839 22.4413 20 23.2044 20 24V29C20 29.2652 20.1054 29.5196 20.2929 29.7071C20.4804 29.8946 20.7348 30 21 30C21.2652 30 21.5196 29.8946 21.7071 29.7071C21.8946 29.5196 22 29.2652 22 29V24C22.0006 22.8888 21.6292 21.8093 20.945 20.9338C22.6213 20.7038 24.1578 19.875 25.2707 18.6006C26.3837 17.3261 26.9979 15.692 27 14V13C26.9875 11.7572 26.6566 10.5384 26.0387 9.46ZM25 14C25 15.3261 24.4732 16.5979 23.5355 17.5355C22.5979 18.4732 21.3261 19 20 19H14C12.6739 19 11.4021 18.4732 10.4645 17.5355C9.52678 16.5979 9 15.3261 9 14V13C9.01226 12 9.31164 11.0247 9.8625 10.19C9.96519 10.0547 10.0317 9.89537 10.0558 9.72719C10.0798 9.559 10.0606 9.38746 10 9.22875C9.73953 8.557 9.61417 7.84045 9.63112 7.12016C9.64806 6.39988 9.80698 5.69001 10.0988 5.03125C10.9171 5.11929 11.7052 5.39039 12.4046 5.82447C13.104 6.25854 13.6966 6.84444 14.1388 7.53875C14.2288 7.67963 14.3528 7.79567 14.4994 7.87625C14.6459 7.95683 14.8103 7.99938 14.9775 8H19.0212C19.1891 8.00001 19.3543 7.95776 19.5015 7.87715C19.6487 7.79654 19.7733 7.68017 19.8638 7.53875C20.3058 6.84438 20.8985 6.25843 21.5978 5.82435C22.2972 5.39027 23.0853 5.1192 23.9037 5.03125C24.1951 5.69018 24.3536 6.40013 24.3701 7.12041C24.3866 7.8407 24.2609 8.55716 24 9.22875C23.9396 9.38595 23.9193 9.55574 23.9412 9.72274C23.963 9.88973 24.0262 10.0486 24.125 10.185C24.6813 11.0197 24.9851 11.997 25 13V14Z"
      fill="currentColor"
    />
  </svg>
);

const LinkedinIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M27 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V27C3 27.5304 3.21071 28.0391 3.58579 28.4142C3.96086 28.7893 4.46957 29 5 29H27C27.5304 29 28.0391 28.7893 28.4142 28.4142C28.7893 28.0391 29 27.5304 29 27V5C29 4.46957 28.7893 3.96086 28.4142 3.58579C28.0391 3.21071 27.5304 3 27 3ZM27 27H5V5H27V27ZM12 14V22C12 22.2652 11.8946 22.5196 11.7071 22.7071C11.5196 22.8946 11.2652 23 11 23C10.7348 23 10.4804 22.8946 10.2929 22.7071C10.1054 22.5196 10 22.2652 10 22V14C10 13.7348 10.1054 13.4804 10.2929 13.2929C10.4804 13.1054 10.7348 13 11 13C11.2652 13 11.5196 13.1054 11.7071 13.2929C11.8946 13.4804 12 13.7348 12 14ZM23 17.5V22C23 22.2652 22.8946 22.5196 22.7071 22.7071C22.5196 22.8946 22.2652 23 22 23C21.7348 23 21.4804 22.8946 21.2929 22.7071C21.1054 22.5196 21 22.2652 21 22V17.5C21 16.837 20.7366 16.2011 20.2678 15.7322C19.7989 15.2634 19.163 15 18.5 15C17.837 15 17.2011 15.2634 16.7322 15.7322C16.2634 16.2011 16 16.837 16 17.5V22C16 22.2652 15.8946 22.5196 15.7071 22.7071C15.5196 22.8946 15.2652 23 15 23C14.7348 23 14.4804 22.8946 14.2929 22.7071C14.1054 22.5196 14 22.2652 14 22V14C14.0012 13.7551 14.0923 13.5191 14.256 13.3369C14.4197 13.1546 14.6446 13.0388 14.888 13.0114C15.1314 12.9839 15.3764 13.0468 15.5765 13.188C15.7767 13.3292 15.918 13.539 15.9738 13.7775C16.6502 13.3186 17.4389 13.0526 18.2552 13.0081C19.0714 12.9637 19.8844 13.1424 20.6067 13.5251C21.329 13.9078 21.9335 14.48 22.3551 15.1803C22.7768 15.8806 22.9997 16.6825 23 17.5ZM12.5 10.5C12.5 10.7967 12.412 11.0867 12.2472 11.3334C12.0824 11.58 11.8481 11.7723 11.574 11.8858C11.2999 11.9994 10.9983 12.0291 10.7074 11.9712C10.4164 11.9133 10.1491 11.7704 9.93934 11.5607C9.72956 11.3509 9.5867 11.0836 9.52882 10.7926C9.47094 10.5017 9.50065 10.2001 9.61418 9.92597C9.72771 9.65189 9.91997 9.41762 10.1666 9.2528C10.4133 9.08797 10.7033 9 11 9C11.3978 9 11.7794 9.15804 12.0607 9.43934C12.342 9.72064 12.5 10.1022 12.5 10.5Z"
      fill="currentColor"
    />
  </svg>
);

const MailIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M28 6H4C3.73478 6 3.48043 6.10536 3.29289 6.29289C3.10536 6.48043 3 6.73478 3 7V24C3 24.5304 3.21071 25.0391 3.58579 25.4142C3.96086 25.7893 4.46957 26 5 26H27C27.5304 26 28.0391 25.7893 28.4142 25.4142C28.7893 25.0391 29 24.5304 29 24V7C29 6.73478 28.8946 6.48043 28.7071 6.29289C28.5196 6.10536 28.2652 6 28 6ZM16 16.6437L6.57125 8H25.4287L16 16.6437ZM12.3387 16L5 22.7262V9.27375L12.3387 16ZM13.8188 17.3563L15.3188 18.7375C15.5032 18.9069 15.7446 19.0008 15.995 19.0008C16.2454 19.0008 16.4868 18.9069 16.6712 18.7375L18.1712 17.3563L25.4212 24H6.57125L13.8188 17.3563ZM19.6612 16L27 9.2725V22.7275L19.6612 16Z"
      fill="currentColor"
    />
  </svg>
);

const LogoIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 102 148"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="51"
      y="0"
      width="51"
      height="51"
      transform="rotate(90 51 0)"
      fill="currentColor"
    />
    <path
      d="M8 97.7432C9.47696 97.9107 10.9782 98 12.5 98C34.3153 98 52 80.3152 52 58.5C52 55.9353 51.752 53.4285 51.2852 51L101.688 51C101.894 53.4729 102 55.9741 102 58.5C102 107.929 61.9295 148 12.5 148C10.991 148 9.4907 147.962 8.00001 147.889L8 97.7432Z"
      fill="currentColor"
    />
  </svg>
);

// --- Types & Config ---

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
    title: "Navigation",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Projects", href: "/projects" },
      { label: "Skills", href: "/skills" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Projects",
    links: [
      { label: "Featured Work", href: "/projects#featured" },
      { label: "Web Apps", href: "/projects#web" },
      { label: "Open Source", href: "/projects#opensource" },
      { label: "Experiments", href: "/projects#experiments" },
    ],
  },
  {
    title: "Connect",
    links: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/hirepavelstepanov",
        external: true,
      },
      {
        label: "GitHub",
        href: "https://github.com/pstepanovum",
        external: true,
      },
      { label: "Email", href: "mailto:contact@pstepanov.work", external: true },
      { label: "Resume", href: "/contact", external: true },
    ],
  },
];

const socialLinks: SocialLink[] = [
  {
    icon: GithubIcon,
    href: "https://github.com/pstepanovum",
    label: "GitHub Profile",
  },
  {
    icon: LinkedinIcon,
    href: "https://www.linkedin.com/in/hirepavelstepanov",
    label: "LinkedIn Profile",
  },
  {
    icon: MailIcon,
    href: "mailto:contact@pstepanov.work",
    label: "Send Email",
  },
];

const Footer = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
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
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSectionClick = (title: string) => {
    if (isLargeScreen) return;

    setActiveSection((prev) => (prev === title ? null : title));

    if (sectionRefs.current[title] && !isLargeScreen) {
      const yOffset = -20;
      const element = sectionRefs.current[title];
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }
  };

  const renderLink = (link: FooterLink) => {
    const Component = link.external ? "a" : Link;
    const externalProps = link.external
      ? {
          target: "_blank",
          rel: "noopener noreferrer",
        }
      : {};

    return (
      <Component
        href={link.href}
        {...externalProps}
        className="group text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white inline-flex items-center"
      >
        {link.label}
        {link.external && (
          <ExternalLinkIcon
            className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
      </Component>
    );
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = footerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    targetPosRef.current = target;

    if (!currentPosRef.current) {
      currentPosRef.current = { ...target };
      setMousePos({ ...target });
    }

    if (!rafRef.current) {
      const lerp = 0.08;
      const animate = () => {
        if (!targetPosRef.current || !currentPosRef.current) return;
        currentPosRef.current = {
          x: currentPosRef.current.x + (targetPosRef.current.x - currentPosRef.current.x) * lerp,
          y: currentPosRef.current.y + (targetPosRef.current.y - currentPosRef.current.y) * lerp,
        };
        setMousePos({ ...currentPosRef.current });
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }
  };

  const handleMouseLeave = () => {
    targetPosRef.current = null;
    currentPosRef.current = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setMousePos(null);
  };

  return (
    <footer
      ref={footerRef}
      className="dotted relative w-full bg-background dark:bg-black text-foreground dark:text-white [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1)]"
      role="contentinfo"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Ticker text="/ 01000010 01001100 01000001 01000011 01001011 01010011 01001101 01001001 01010100 01001000" />

      {mousePos && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect x='9' y='9' width='2' height='2' fill='rgba(255%2C255%2C255%2C0.8)'/%3E%3C/svg%3E\")",
            backgroundSize: "20px 20px",
            backgroundPosition: "center",
            WebkitMaskImage: `radial-gradient(circle 180px at ${mousePos.x}px ${mousePos.y}px, white 0%, transparent 100%)`,
            maskImage: `radial-gradient(circle 180px at ${mousePos.x}px ${mousePos.y}px, white 0%, transparent 100%)`,
          }}
        />
      )}
      <Container className="relative">
        <div className="py-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-6">
              <Link
                href="/"
                className="inline-flex items-center gap-3 group hover:opacity-90"
              >
                <LogoIcon
                  className="h-8 w-auto text-foreground dark:text-white"
                  aria-hidden="true"
                />
                <span className="text-2xl font-bold text-foreground dark:text-white">
                  Pavel.
                </span>
              </Link>
              <p className="text-sm text-foreground/60 dark:text-white/60 max-w-xs leading-relaxed">
                Full-stack developer crafting beautiful, functional, and
                scalable web applications.
              </p>
              <nav
                aria-label="Social media links"
                className="flex flex-wrap gap-4"
              >
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative w-10 h-10 flex items-center justify-center bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-foreground/50 dark:focus-visible:ring-white/50 focus-visible:outline-none"
                    aria-label={label}
                  >
                    <Icon
                      className="w-5 h-5 relative z-10 text-foreground dark:text-white"
                      aria-hidden="true"
                    />
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
                    <ChevronDownIcon
                      className={`w-4 h-4 lg:hidden transition-transform duration-200 ease-in-out ${
                        activeSection === section.title ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <ul
                    className={`space-y-3 overflow-hidden transition-all duration-200 ease-in-out ${
                      activeSection === section.title || isLargeScreen
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0 lg:max-h-96 lg:opacity-100"
                    }`}
                  >
                    {section.links.map((link) => (
                      <li key={link.label}>{renderLink(link)}</li>
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
                  Interested in working together? Let&apos;s discuss your
                  project.
                </p>
              </div>
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center whitespace-nowrap px-6 py-3 bg-foreground dark:bg-white text-background dark:text-black hover:bg-foreground/90 dark:hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-foreground/50 dark:focus-visible:ring-white/50 focus-visible:outline-none w-full md:w-auto min-w-[140px]"
              >
                Let&apos;s Talk
                <ArrowUpRightIcon
                  className="w-4 h-4 ml-2 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-foreground/10 dark:border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <p className="text-xs sm:text-sm text-foreground/60 dark:text-white/60 text-center sm:text-left order-2 sm:order-1">
                © {new Date().getFullYear()} Pavel Stepanov. All rights
                reserved.
              </p>
              <div className="flex items-center justify-center space-x-2 order-1 sm:order-2">
                <TypewriterText
                  text="Built with Next.js & Tailwind CSS"
                  className="text-xs sm:text-sm text-foreground/40 dark:text-white/40"
                  typingSpeed={10}
                  scrambleLength={3}
                >
                  <CodeIcon
                    className="w-4 h-4 text-foreground/40 dark:text-white/40 mr-2"
                    aria-hidden="true"
                  />
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
