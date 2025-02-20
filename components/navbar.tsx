"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { Container } from "@/components/container";
import { ThemeToggle } from '@/components/theme-toggle'
import { Cross as HamburgerCross } from 'hamburger-react';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from 'lucide-react';

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

  // Optimize scroll handler with throttling
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
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Reset styles when menu is closed
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      // Cleanup
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
    };
  }, [isMenuOpen]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200
        ${scrolled && !isMenuOpen ? "backdrop-blur-xl backdrop-saturate-150 bg-black/10 shadow-lg" : "bg-transparent"}
      `}
      role="banner"
    >
      <Container>
        <nav
          className="flex justify-between items-center h-20 lg:h-24 px-4"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo with non-selectable text */}
          <Link
            href="/"
            className="relative z-10 text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg p-2 select-none"
          >
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent pointer-events-none">
              Pavel.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden min-[1144px]:flex items-center gap-8">
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
          <div className="relative z-10 min-[1144px]:hidden">
            <HamburgerCross 
              toggled={isMenuOpen}
              toggle={toggleMenu}
              color="white"
              size={20}
              duration={0.3}
            />
          </div>

          {/* Mobile Menu - Background and content transitions synchronized */}
          <div
            id="mobile-menu"
            className={`fixed inset-0 z-40 bg-black/35 backdrop-blur-lg transition-opacity duration-300 ${
              isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
            style={{ pointerEvents: isMenuOpen ? 'auto' : 'none' }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
          >
            <Container>
              <nav className="h-20 flex justify-between items-center px-4">
                <Link 
                  href="/" 
                  onClick={closeMenu}
                  className="p-2 select-none"
                >
                  <span className="text-2xl bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent pointer-events-none">
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