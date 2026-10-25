/**
 * The mobile apps the dashboard manages. Plain data so client components can
 * import it; the admin secret itself is read only in `codes-client.ts`.
 */

export type ManagedAppId = "margin" | "nibble" | "heft" | "nepsis" | "cadence";

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
  /** The env var holding the app's owner secret (a copy of the app's own Secret Manager secret). */
  secretEnv: string;
  /** The app's Secret Manager secret that `secretEnv` copies. Defaults to `cron-secret`. */
  secretName?: string;
  /** What a code turns on, in the app's own words. Defaults to "Plus". */
  tier?: string;
  /**
   * The app this one shares its Firebase project with, and therefore its
   * account, its Plus, and the friendCodes collection itself. Nibble and Heft
   * do: a code made on either page appears on both, and redeeming either link
   * turns Plus on in both apps. The prefix only says which website the share
   * link points at. Margin stands alone.
   */
  sharesCodesWith?: string;
  /**
   * The app keeps contact-form messages the dashboard lists and answers,
   * through its `/api/admin/support` with the same owner secret.
   */
  support?: boolean;
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
    sharesCodesWith: "Heft",
  },
  {
    id: "heft",
    name: "Heft",
    tagline: "Lifting and cardio streaks",
    baseUrl: "https://heft.pstepanov.dev",
    icon: "/images/apps/heft.png",
    secretEnv: "HEFT_ADMIN_SECRET",
    sharesCodesWith: "Nibble",
  },
  {
    // Shares Heft's and Nibble's Firebase project and account, but not their
    // codes: its own collection, and a code gives Nepsis Premium only.
    id: "nepsis",
    name: "Nepsis",
    tagline: "Screen time earned with your brain",
    baseUrl: "https://nepsis.pstepanov.dev",
    icon: "/images/apps/nepsis.png",
    secretEnv: "NEPSIS_ADMIN_SECRET",
    secretName: "nepsis-admin-secret",
    tier: "Premium",
  },
  {
    // Its own Firebase project, codes and Plus. A code is a third Plus
    // source on the account, redeemed only on the website.
    id: "cadence",
    name: "Cadence",
    tagline: "Advanced English, out loud",
    baseUrl: "https://cadence.pstepanov.dev",
    icon: "/images/apps/cadence.png",
    secretEnv: "CADENCE_ADMIN_SECRET",
    secretName: "admin-secret",
    tier: "Plus",
    support: true,
  },
];

/** What a code turns on in this app: "Plus", or Nepsis's "Premium". */
export function tierOf(app: ManagedApp) {
  return app.tier ?? "Plus";
}

export function getManagedApp(id: string): ManagedApp | null {
  return MANAGED_APPS.find((app) => app.id === id) ?? null;
}

/** The link a friend opens to redeem a code, with the code filled in. */
export function redeemLink(app: ManagedApp, code: string) {
  return `${app.baseUrl}/redeem?code=${encodeURIComponent(code)}`;
}

/**
 * The lengths of Plus a code can give, as the form offers them. Every code
 * ends: there is no lifetime choice, and `maxDurationDays` caps a custom one.
 * The app servers enforce the same range, so a hand-made request cannot widen it.
 */
export const CODE_DURATIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "12 months" },
] as const;

export const MAX_CODE_DURATION_DAYS = 730;

/** How long a code's Plus (or Premium) lasts, in the same words the apps' pages use. */
export function describeDuration(days: number) {
  if (days < 1) return "Retired";
  const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;
  if (days % 365 === 0) return plural(days / 365, "year");
  if (days % 30 === 0) return plural(days / 30, "month");
  return plural(days, "day");
}
