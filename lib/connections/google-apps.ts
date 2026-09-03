export type GoogleAppKey = "gmail" | "calendar" | "drive" | "sheets" | "docs" | "tasks" | "slides";

export type GoogleApp = {
  key: GoogleAppKey;
  name: string;
  description: string;
  scope: "gmail" | "google";
  /** Composio toolkit slug on logos.composio.dev; must be exact, unknown slugs return a placeholder. */
  logoSlug: string;
};

export const LOGO_CDN = "https://logos.composio.dev/api";

/**
 * Every Google app shares the account connections and the OAuth grant; this
 * list only drives the dashboard cards, pages, and tool catalog grouping.
 */
export const GOOGLE_APPS: GoogleApp[] = [
  { key: "gmail", name: "Gmail", description: "Mail, drafts, labels, settings, and contacts.", scope: "gmail", logoSlug: "gmail" },
  { key: "calendar", name: "Google Calendar", description: "Events, availability, and Meet links.", scope: "google", logoSlug: "googlecalendar" },
  { key: "drive", name: "Google Drive", description: "Search, read, upload, organise, and share files.", scope: "google", logoSlug: "googledrive" },
  { key: "sheets", name: "Google Sheets", description: "Read and write spreadsheet cells.", scope: "google", logoSlug: "googlesheets" },
  { key: "docs", name: "Google Docs", description: "Read, create, and edit documents.", scope: "google", logoSlug: "googledocs" },
  { key: "tasks", name: "Google Tasks", description: "Task lists and to-dos.", scope: "google", logoSlug: "googletasks" },
  { key: "slides", name: "Google Slides", description: "Read and create presentations.", scope: "google", logoSlug: "googleslides" },
];

export function getGoogleApp(key: string): GoogleApp | undefined {
  return GOOGLE_APPS.find((app) => app.key === key);
}
