import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Admin surface tokens. Each already encodes its own alpha, so use them
        // directly rather than with a Tailwind opacity modifier (bg-admin-panel,
        // never bg-admin-panel/50).
        admin: {
          bg: "var(--admin-bg)",
          panel: "var(--admin-panel)",
          inset: "var(--admin-inset)",
          border: "var(--admin-border)",
          "border-strong": "var(--admin-border-strong)",
          fg: "var(--admin-fg)",
          strong: "var(--admin-strong)",
          muted: "var(--admin-muted)",
          subtle: "var(--admin-subtle)",
          hover: "var(--admin-hover)",
          "hover-strong": "var(--admin-hover-strong)",
          accent: "var(--admin-accent)",
          "accent-hover": "var(--admin-accent-hover)",
          "accent-fg": "var(--admin-accent-fg)",
          ring: "var(--admin-ring)",
          "danger-bg": "var(--admin-danger-bg)",
          "danger-border": "var(--admin-danger-border)",
          "danger-hover": "var(--admin-danger-hover)",
          "danger-fg": "var(--admin-danger-fg)",
          "success-bg": "var(--admin-success-bg)",
          "success-border": "var(--admin-success-border)",
          "success-fg": "var(--admin-success-fg)",
          "warning-bg": "var(--admin-warning-bg)",
          "warning-border": "var(--admin-warning-border)",
          "warning-fg": "var(--admin-warning-fg)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
