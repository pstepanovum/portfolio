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
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 3v4M15 3v4M7 7h10a2 2 0 0 1 2 2v3a7 7 0 0 1-14 0V9a2 2 0 0 1 2-2Zm5 12v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
