"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import { Container } from "@/components/container";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const NavLinkText = ({ label }: { label: string }) => {
  const [labelDisplay, setLabelDisplay] = useState(label);
  const animatingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const scramble = useCallback(async () => {
    if (animatingRef.current || !mountedRef.current) return;
    animatingRef.current = true;

    const end = Date.now() + 300;
    while (Date.now() < end) {
      if (!mountedRef.current) break;
      setLabelDisplay(label.split('').map(c => c === ' ' ? ' ' : randomChar()).join(''));
      await sleep(30);
    }

    let current = label.split('').map(c => c === ' ' ? ' ' : randomChar());
    for (let pos = 0; pos < label.length; pos++) {
      if (!mountedRef.current) break;
      for (let i = 0; i < 3; i++) {
        const next = [...current];
        for (let j = pos; j < label.length; j++) {
          if (label[j] !== ' ') next[j] = randomChar();
        }
        if (i === 2) next[pos] = label[pos];
        current = next;
        setLabelDisplay(current.join(''));
        await sleep(30);
      }
      await sleep(40);
    }

    setLabelDisplay(label);
    animatingRef.current = false;
  }, [label]);

  const handleHover = useCallback(() => {
    if (!animatingRef.current) scramble();
  }, [scramble]);

  return <span onMouseEnter={handleHover}>{labelDisplay}</span>;
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
        className={`text-sm tracking-widest transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 px-2 py-1 ${
          isActive ? "text-white" : "text-white/40 hover:text-white/70"
        }`}
        role="menuitem"
        aria-current={isActive ? "page" : undefined}
      >
        <NavLinkText label={link.label.toUpperCase()} />
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
          className="relative flex h-16 items-center justify-between lg:h-18"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="group relative z-10 flex items-center gap-3 py-2 pr-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <LogoIcon className="h-8 w-auto text-white group-hover:opacity-90 transition-opacity" />
            <span className="text-2xl font-bold text-white pointer-events-none">
              Pavel.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden min-[1144px]:flex absolute left-1/2 -translate-x-1/2 items-center gap-1" role="menubar">
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
          <button
            className="relative z-50 min-[1144px]:hidden text-xs tracking-widest text-white focus-visible:outline-none"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? "CLOSE" : "MENU"}
          </button>

          {/* Mobile Menu */}
          <div
            id="mobile-menu"
            className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
              isMenuOpen ? "visible opacity-100" : "invisible opacity-0"
            }`}
            style={{ pointerEvents: isMenuOpen ? "auto" : "none" }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
          >
            <div className="flex flex-col h-full px-8 py-12">
              <ul className="flex flex-col gap-2 mt-24" role="menu">
                {navLinks.map((link) => (
                  <li key={link.id} role="none">
                    <Link
                      href={link.href}
                      className={`inline-block text-4xl tracking-tight py-2 transition-colors duration-200 ${
                        pathname === link.href ? "text-white" : "text-white/30 hover:text-white/70"
                      }`}
                      onClick={closeMenu}
                      role="menuitem"
                      aria-current={pathname === link.href ? "page" : undefined}
                    >
                      <NavLinkText label={link.label.toUpperCase()} />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <ContactButton onClick={closeMenu} />
              </div>
            </div>
          </div>
        </nav>
      </Container>
    </header>
  );
}
