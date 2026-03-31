"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import { Container } from "@/components/container";
import { Cross as HamburgerCross } from "hamburger-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const CloseIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M8 8L24 24M24 8L8 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
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

// ------------------------

const navLinks = [
  { href: "/", label: "Home", id: "home" },
  { href: "/about", label: "About", id: "about" },
  { href: "/projects", label: "Projects", id: "projects" },
  { href: "/skills", label: "Skills", id: "skills" },
  { href: "/contact", label: "Contact", id: "contact" },
] as const;

const SCRAMBLE_CHARS = '!<>-_\\/{}—=+*^?#';

const NavLinkText = ({ label, isActive }: { label: string; isActive: boolean }) => {
  const targetText = isActive ? `[ ${label} ]` : label;
  const [displayText, setDisplayText] = useState(targetText);
  const prevTargetRef = useRef(targetText);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (targetText === prevTargetRef.current) return;
    prevTargetRef.current = targetText;
    if (animRef.current) clearTimeout(animRef.current);

    const target = targetText;
    const steps = 14;
    const stepDuration = 22;
    let step = 0;

    const animate = () => {
      if (!mountedRef.current) return;
      step++;
      if (step >= steps) { setDisplayText(target); return; }
      const revealed = Math.floor((step / steps) * target.length);
      const scrambled = target.split('').map((char, i) => {
        if (i < revealed || char === ' ') return char;
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }).join('');
      setDisplayText(scrambled);
      animRef.current = setTimeout(animate, stepDuration);
    };

    animate();
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [targetText]);

  return <span>{displayText}</span>;
};

const NavItem = memo(
  ({
    link,
    isActive,
    onClick,
  }: {
    link: (typeof navLinks)[number];
    isActive: boolean;
    onClick?: () => void;
  }) => (
    <li role="none">
      <Link
        href={link.href}
        onClick={onClick}
        className={`text-sm tracking-widest transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 px-3 py-2 ${
          isActive ? "text-white" : "text-white/40 hover:text-white/70"
        }`}
        role="menuitem"
        aria-current={isActive ? "page" : undefined}
      >
        <NavLinkText label={link.label.toUpperCase()} isActive={isActive} />
      </Link>
    </li>
  )
);
NavItem.displayName = "NavItem";

const ContactButton = memo(
  ({
    className = "",
    onClick,
  }: {
    className?: string;
    onClick?: () => void;
  }) => {
    const router = useRouter();

    const handleClick = () => {
      if (onClick) {
        onClick();
      }
      router.push("/contact");
    };

    return (
      <button
        className={`px-6 py-2 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${className}`}
        role="menuitem"
        onClick={handleClick}
        aria-label="Navigate to contact page"
      >
        Let&apos;s Talk
      </button>
    );
  }
);
ContactButton.displayName = "ContactButton";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle menu open/close and body scroll
  useEffect(() => {
    if (isMenuOpen) {
      // Fix for Safari: prevent scrolling on the body and html elements
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.documentElement.style.overflow = "hidden";
    } else {
      // Reset styles when menu is closed
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      // Cleanup
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
    };
  }, [isMenuOpen]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled || isMenuOpen ? "bg-black" : "bg-transparent"}`}
      role="banner"
    >
      <Container>
        <nav
          className="relative flex justify-between items-center h-16 lg:h-18 px-4"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="relative z-10 flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 p-2 select-none group"
          >
            <LogoIcon className="h-8 w-auto text-white group-hover:opacity-90 transition-opacity" />
            <span className="text-2xl font-bold text-white pointer-events-none">
              Pavel.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden min-[1144px]:flex absolute left-1/2 -translate-x-1/2 items-center gap-4" role="menubar">
            {navLinks.map((link) => (
              <NavItem
                key={link.id}
                link={link}
                isActive={pathname === link.href}
              />
            ))}
          </ul>

          <div className="hidden min-[1144px]:flex">
            <ContactButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="relative z-10 min-[1144px]:hidden">
            <HamburgerCross
              toggled={isMenuOpen}
              toggle={toggleMenu}
              color="white"
              size={20}
              duration={0.3}
            />
          </div>

          {/* Mobile Menu */}
          <div
            id="mobile-menu"
            className={`fixed inset-0 z-40 bg-black/35 backdrop-blur-lg transition-opacity duration-300 ${
              isMenuOpen ? "visible opacity-100" : "invisible opacity-0"
            }`}
            style={{ pointerEvents: isMenuOpen ? "auto" : "none" }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
          >
            <Container>
              <nav className="h-20 flex justify-between items-center px-4">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="flex items-center gap-3 p-2 select-none"
                >
                  <LogoIcon className="h-8 w-auto text-white" />
                  <span className="text-2xl font-bold text-white pointer-events-none">
                    Pavel.
                  </span>
                </Link>
                <button
                  onClick={closeMenu}
                  className="p-2 hover:bg-white/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label="Close menu"
                >
                  <CloseIcon className="w-6 h-6 text-white" />
                </button>
              </nav>
            </Container>

            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-18rem)]">
              <ul className="flex flex-col items-center gap-5" role="menu">
                {navLinks.map((link) => (
                  <li key={link.id} role="none">
                    <Link
                      href={link.href}
                      className={`inline-block text-3xl px-4 py-2 ${
                        pathname === link.href
                          ? "text-white"
                          : "text-white/70 hover:text-white"
                      }`}
                      onClick={closeMenu}
                      role="menuitem"
                      aria-current={pathname === link.href ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </Container>
    </header>
  );
}
