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

**Content pattern:** Content comes from two places.

*Firestore-backed (edited through the dashboard or MCP):* projects, certifications, timeline entries, contact submissions, and dashboard settings. All access goes through `lib/firebase/portfolio-core.ts`, which is transport-agnostic — the dashboard API routes and the MCP server both call the same functions. Zod input schemas live in `lib/firebase/schemas.ts`.

*Authored in code:* skills, proficiency levels, tooling, and core values live in `lib/content/background.ts` as plain serializable objects. Pages map the `iconKey` field back to React icon components (`app/about/about-data.tsx`, `app/skills/skills-page-client.tsx`). Keep this module JSON-safe — the MCP server serves it directly.

**Admin dashboard:** `/dashboard` behind Firebase Auth with an `admin` custom claim and a session cookie (`lib/firebase/auth.ts`). Its API routes live under `app/api/admin/*` and authenticate via `requireAdminRequest`.

**MCP server:** `app/api/mcp/route.ts` exposes the portfolio over the Model Context Protocol (Streamable HTTP, stateless, JSON responses — Cloud Run gives no instance affinity, so no session state may live in memory). Tools are registered in `lib/mcp/` and gated by scope: `portfolio:read` always, `portfolio:write` only when granted.

**Admin MCP server:** `app/api/mcp/admin/route.ts` is a second, separate MCP resource exposing the Gmail accounts connected on the dashboard (`lib/mcp/admin-server.ts`; tools in `lib/mcp/tools/gmail.ts` for mail and drafts, `gmail-settings.ts` for labels, filters, vacation, send-as, IMAP/POP, forwarding, and push watch, with the shared `withAccount` wrapper in `gmail-shared.ts`). Tools take an `account` parameter (alias, email, or id) resolved by `lib/connections/store.ts`; it is optional only when exactly one account is connected. Scopes are `gmail:read` / `gmail:write`.

**Apps dashboard:** `/dashboard/connections` is the Composio-style apps overview: an activity heatmap and streaks (`lib/mcp/activity.ts`, fed by `withActivityLogging`, a Proxy around `McpServer.registerTool` that times and logs every tool call on both servers into the `activity` collection), the apps grid, and recent activity. `/dashboard/connections/gmail` is the Gmail app view with connected accounts and the "Available tools" list, which is generated from the real registration functions via `lib/mcp/tool-catalog.ts` so it cannot drift. `/dashboard/connections/custom/[id]` shows a registered custom MCP server.

**Custom MCP servers:** `lib/connections/custom-mcp.ts` registers a remote Streamable HTTP MCP server (auth: none, bearer, or OAuth 2.1 — for OAuth the admin server acts as the SDK's `OAuthClientProvider`, `lib/connections/mcp-oauth.ts`, persisting registration, tokens, PKCE verifier, and discovery state encrypted on the server's document; callback at `/api/admin/custom-mcp/oauth/callback`; a rejected grant flips the server to `reauth`), discovers its tools with the SDK client at registration time and stores them as JSON, and proxies calls on demand. `lib/mcp/tools/custom.ts` exposes each as `<slug>__<tool>` under the `mcp:tools` scope, converting the remote's JSON Schema with `z.fromJSONSchema` so arguments are validated before the proxy hop. Collection: `customMcpServers`.

**Connections (Gmail):** `/dashboard/connections/gmail` runs Google's OAuth code flow directly against a self-owned OAuth client (`lib/connections/google.ts`; the 12-scope set from Composio's Gmail consent screen: `https://mail.google.com/`, both `gmail.settings.*` scopes, identity, contacts, other contacts, and the People API self-profile scopes; contact tools use `lib/connections/people.ts`). Refresh tokens are stored AES-256-GCM encrypted in the `connections` collection (`lib/connections/crypto.ts`); the connect flow binds an encrypted `state` to a cookie nonce (`lib/connections/state.ts`). Requires `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `CONNECTIONS_ENCRYPTION_KEY` (`openssl rand -base64 32`). While the Google consent screen is in Testing status, refresh tokens expire after 7 days: `getAccessTokenForConnection` flips the record to `expired` on `invalid_grant` and the dashboard offers Reconnect. The Gmail REST client is `lib/connections/gmail.ts`; no Google SDK is used.

**OAuth 2.1:** The app is its own authorization server for two resources, `/api/mcp` (portfolio) and `/api/mcp/admin` (`MCP_RESOURCES` in `lib/oauth/config.ts`). Tokens are audience-bound to one resource and scopes are validated per resource; discovery for non-root resources is path-suffixed (`/.well-known/oauth-protected-resource/api/mcp/admin`), forwarded to the handler as `?resource=` by the rewrite. Opaque tokens are stored as SHA-256 digests in Firestore (`oauthClients`, `oauthCodes`, `oauthTokens`), so a leak exposes no usable credential and revocation is immediate. Dynamic client registration is open, but no token can be minted without an admin sign-in at the consent screen (`app/oauth/authorize`). PKCE S256 is mandatory. Discovery metadata is served through `/.well-known/*` rewrites in `next.config.ts` — the App Router skips dot-prefixed directories, so these cannot be plain route folders. Set `OAUTH_ISSUER` to override the issuer origin on preview or custom domains.

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

**Deployment:** Firebase App Hosting / Next.js server deployment. Path alias `@/*` maps to the repo root.

**Scripts:** `npm run firebase:seed` seeds Firestore from `lib/content/defaults.ts`; `npm run firebase:create-admin` provisions the admin user. Scripts that import modules marked `server-only` must run as `npx tsx --conditions=react-server`.
