"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_THEME_ATTRIBUTE,
  ADMIN_THEME_STORAGE_KEY,
  isAdminTheme,
  type AdminTheme,
} from "@/components/admin/theme-constants";

const SunIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme>("dark");

  // The inline script has already set the attribute by now; read it back rather
  // than storage so the button always reflects what is actually on screen.
  useEffect(() => {
    const current = document.documentElement.getAttribute(ADMIN_THEME_ATTRIBUTE);
    setTheme(isAdminTheme(current) ? current : "dark");
  }, []);

  const toggleTheme = () => {
    const next: AdminTheme = theme === "dark" ? "light" : "dark";

    setTheme(next);
    document.documentElement.setAttribute(ADMIN_THEME_ATTRIBUTE, next);

    try {
      window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable; the theme still applies for this page view.
    }
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center border border-admin-border bg-admin-hover text-admin-muted transition-colors hover:bg-admin-hover-strong hover:text-admin-fg"
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
    </button>
  );
}
