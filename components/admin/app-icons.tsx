export function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#4285f4" d="M6 12v24a3 3 0 0 0 3 3h5V21l10 7.5L34 21v18h5a3 3 0 0 0 3-3V12l-18 13.5z" />
      <path fill="#34a853" d="M6 12v24a3 3 0 0 0 3 3h5V21z" />
      <path fill="#fbbc04" d="M34 21v18h5a3 3 0 0 0 3-3V12z" />
      <path fill="#ea4335" d="M6 12l18 13.5L42 12v-1.5a4.5 4.5 0 0 0-7.2-3.6L24 15 13.2 6.9A4.5 4.5 0 0 0 6 10.5z" />
    </svg>
  );
}

export function McpIcon({ className }: { className?: string }) {
  // Background rect dropped and fill set to currentColor so it follows the theme.
  return (
    <svg viewBox="0 0 101 101" fill="none" className={className} aria-hidden="true">
      <path
        d="M50 71.9375V81.4062H40.5312V71.9375H50ZM67.25 40.5312C75.6465 40.5313 82.4531 47.3379 82.4531 55.7344C82.4531 64.1308 75.6465 70.9375 67.25 70.9375H51V61.4688H67.25C70.417 61.4688 72.9844 58.9014 72.9844 55.7344C72.9844 52.5674 70.417 50 67.25 50H51V40.5312H67.25ZM33.75 30.0625H50V39.5312H33.75C30.583 39.5312 28.0156 42.0986 28.0156 45.2656C28.0156 48.4326 30.583 51 33.75 51H50V60.4688H33.75C25.3535 60.4688 18.5469 53.6621 18.5469 45.2656C18.5469 36.8692 25.3535 30.0625 33.75 30.0625ZM60.4688 19.5938V29.0625H51V19.5938H60.4688Z"
        fill="currentColor"
        stroke="currentColor"
      />
    </svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="6" y="8" width="36" height="34" rx="4" fill="#fff" stroke="#4285f4" strokeWidth="3" />
      <rect x="6" y="8" width="36" height="10" fill="#4285f4" />
      <text x="24" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill="#4285f4" fontFamily="sans-serif">31</text>
    </svg>
  );
}

export function DriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M17 6h14l13 22H30z" fill="#fbbc04" />
      <path d="M4 28L17 6l7 12-13 22z" fill="#34a853" />
      <path d="M11 40l7-12h26l-7 12z" fill="#4285f4" />
    </svg>
  );
}

export function SheetsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M12 4h16l10 10v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#34a853" />
      <path d="M28 4v10h10z" fill="#188038" />
      <path d="M16 22h16v14H16z M16 27h16 M16 32h16 M22 22v14" stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function DocsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M12 4h16l10 10v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#4285f4" />
      <path d="M28 4v10h10z" fill="#1967d2" />
      <path d="M16 24h16 M16 29h16 M16 34h10" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

export function TasksIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="#fff" stroke="#4285f4" strokeWidth="3" />
      <path d="M15 24l6 6 13-13" stroke="#4285f4" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SlidesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M12 4h16l10 10v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fbbc04" />
      <path d="M28 4v10h10z" fill="#f29900" />
      <rect x="16" y="22" width="16" height="12" fill="#fff" />
    </svg>
  );
}
