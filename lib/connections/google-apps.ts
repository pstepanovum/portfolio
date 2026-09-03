export type GoogleAppKey = "gmail" | "calendar" | "drive" | "sheets" | "docs" | "tasks" | "slides";

export type GoogleApp = {
  key: GoogleAppKey;
  name: string;
  description: string;
  scope: "gmail" | "google";
};

/**
 * Every Google app shares the account connections and the OAuth grant; this
 * list only drives the dashboard cards, pages, and tool catalog grouping.
 */
export const GOOGLE_APPS: GoogleApp[] = [
  { key: "gmail", name: "Gmail", description: "Mail, drafts, labels, settings, and contacts.", scope: "gmail" },
  { key: "calendar", name: "Google Calendar", description: "Events, availability, and Meet links.", scope: "google" },
  { key: "drive", name: "Google Drive", description: "Search, read, upload, organise, and share files.", scope: "google" },
  { key: "sheets", name: "Google Sheets", description: "Read and write spreadsheet cells.", scope: "google" },
  { key: "docs", name: "Google Docs", description: "Read, create, and edit documents.", scope: "google" },
  { key: "tasks", name: "Google Tasks", description: "Task lists and to-dos.", scope: "google" },
  { key: "slides", name: "Google Slides", description: "Read and create presentations.", scope: "google" },
];

export function getGoogleApp(key: string): GoogleApp | undefined {
  return GOOGLE_APPS.find((app) => app.key === key);
}
