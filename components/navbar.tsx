// navbar.tsx

"use client";

import { useState, useEffect, memo } from "react";
import { Container } from "@/components/container";
import { useTheme } from '@/context/theme-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home", id: "home" },
  { href: "/about", label: "About", id: "about" },
  { href: "/projects", label: "Projects", id: "projects" },
  { href: "/skills", label: "Skills", id: "skills" },
  { href: "/contact", label: "Contact", id: "contact" },
] as const;

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
        className={`group relative text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg px-3 py-2 ${
          isActive 
            ? "text-white" 
            : "text-white/80 hover:text-white"
        }`}
        role="menuitem"
        aria-current={isActive ? "page" : undefined}
      >
        {link.label}
        <span
          className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white/90 to-white/40 rounded-full transition-all duration-300 ${
            isActive ? "w-full" : "w-0 group-hover:w-full"
          }`}
          aria-hidden="true"
        />
      </Link>
    </li>
  )
);
NavItem.displayName = "NavItem";

const ContactButton = memo(
  ({ className = "", onClick }: { className?: string; onClick?: () => void }) => {
    const router = useRouter();

    const handleClick = () => {
      if (onClick) {
        onClick();
      }
      router.push('/contact');
    };

    return (
      <button
        className={`px-6 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${className}`}
        role="menuitem"
        onClick={handleClick}
        aria-label="Navigate to contact page"
      >
        Let's Talk
      </button>
    );
  }
);
ContactButton.displayName = "ContactButton";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled && !isMenuOpen
          ? "backdrop-blur-xl backdrop-saturate-150 bg-black/10 shadow-lg"
          : "bg-transparent"
      }`}
      role="banner"
    >
      <Container>
        <nav
          className="flex justify-between items-center h-20 md:h-24 px-4"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="relative z-10 text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg p-2"
          >
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Pavel.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <ul className="flex items-center gap-8" role="menubar">
              {navLinks.map((link) => (
                <NavItem
                  key={link.id}
                  link={link}
                  isActive={pathname === link.href}
                />
              ))}
            </ul>
            <div className="flex items-center gap-6">
              <ThemeToggle />
              <ContactButton />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="relative z-10 md:hidden w-10 h-10 flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <Menu 
              className={`w-6 h-6 absolute transition-all duration-300 ${
                isMenuOpen ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
              }`}
            />
            <X 
              className={`w-6 h-6 absolute transition-all duration-300 ${
                isMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
              }`}
            />
          </button>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div
              id="mobile-menu"
              className="fixed inset-0 z-40 bg-black/95 backdrop-blur-lg"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile menu"
            >
              <Container>
                <nav className="h-20 flex justify-between items-center px-4">
                  <Link 
                    href="/" 
                    onClick={closeMenu}
                    className="p-2"
                  >
                    <span className="text-2xl bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                      Pavel.
                    </span>
                  </Link>
                  <button
                    onClick={closeMenu}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </nav>
              </Container>

              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
                <ul className="flex flex-col items-center gap-8" role="menu">
                  {navLinks.map((link) => (
                    <li key={link.id} role="none">
                      <Link
                        href={link.href}
                        className={`inline-block text-3xl px-4 py-2 ${
                          pathname === link.href
                            ? "text-white"
                            : "text-white/80 hover:text-white"
                        }`}
                        onClick={closeMenu}
                        role="menuitem"
                        aria-current={pathname === link.href ? "page" : undefined}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li role="none" className="pt-8">
                    <ContactButton 
                      className="text-lg px-8 py-3" 
                      onClick={closeMenu}
                    />
                  </li>
                </ul>
              </div>
            </div>
          )}
        </nav>
      </Container>
    </header>
  );
}