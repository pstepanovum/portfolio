/**
 * The mobile apps the dashboard manages. Plain data so client components can
 * import it; the admin secret itself is read only in `codes-client.ts`.
 */

export type ManagedAppId = "margin" | "nibble";

export type ManagedApp = {
  id: ManagedAppId;
  name: string;
  tagline: string;
  /** The app's website, which serves its API and the /redeem page. */
  baseUrl: string;
  /** App Store listing, when the app is live. */
  appStoreUrl?: string;
  /** Icon under /public. */
  icon: string;
  /** The env var holding the app's owner secret (its Cloud Run `cron-secret`). */
  secretEnv: string;
};

export const MANAGED_APPS: readonly ManagedApp[] = [
  {
    id: "margin",
    name: "Margin",
    tagline: "Reading streaks",
    baseUrl: "https://margin.pstepanov.dev",
    appStoreUrl: "https://apps.apple.com/app/id6811490653",
    icon: "/images/apps/margin.png",
    secretEnv: "MARGIN_ADMIN_SECRET",
  },
  {
    id: "nibble",
    name: "Nibble",
    tagline: "Food, water, and weight streaks",
    baseUrl: "https://nibble.pstepanov.dev",
    icon: "/images/apps/nibble.png",
    secretEnv: "NIBBLE_ADMIN_SECRET",
  },
];

export function getManagedApp(id: string): ManagedApp | null {
  return MANAGED_APPS.find((app) => app.id === id) ?? null;
}

/** The link a friend opens to redeem a code, with the code filled in. */
export function redeemLink(app: ManagedApp, code: string) {
  return `${app.baseUrl}/redeem?code=${encodeURIComponent(code)}`;
}
