# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on 0.0.0.0:3000
npm run build    # Production build
npm run lint     # ESLint via Next.js config
npm run start    # Run production server
```

No test runner is configured.

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 3 + Framer Motion

**Routing:** All pages live in `/app` using the App Router. Every page component is marked `"use client"`.

**Content pattern:** All content (projects, skills, experience, values) is hard-coded as TypeScript objects directly in page files or co-located data files — no CMS, no database, no API routes. To update content, edit the source files:
- Projects → `app/projects/page.tsx`
- About/skills/experience → `app/about/about-data.tsx`
- Skills page certifications and tech grids → `app/skills/page.tsx`

**Component organization:**
- `components/` — shared layout components (Navbar, Footer, Container, ThemeToggle)
- `components/page/<route>/` — components scoped to a single page (e.g. `ProjectModal`, `SkillCard`)
- `components/ui/` — low-level UI primitives
- `lib/utils.ts` — exports `cn()` (clsx + tailwind-merge); use this for all className composition

**Styling:**
- Tailwind utility classes are primary. All custom design tokens live as CSS variables in `app/globals.css` (font scale, colors, transitions, typography).
- Custom **Realtime** font family (weights 300–900) loaded from `public/fonts/`. Geist Sans/Mono loaded via `next/font/google`.
- Theme toggle switches between light/dark via CSS variable overrides.

**Animations:** Framer Motion is used for entrance animations (fade-in, stagger) on the Hero section. CSS `@keyframes` handle simpler transitions (fadeInUp, fadeOutUp).

**Modals:** `ProjectModal` in `components/page/projects/` uses Radix UI dialog (`@radix-ui/react-dialog`).

**Images:** Next.js image optimization is disabled (`unoptimized: true` in `next.config.ts`). Images are served from `public/images/` as static assets.

**Deployment:** Netlify via `@netlify/plugin-nextjs`. Config in `netlify.toml`. Path alias `@/*` maps to the repo root.
