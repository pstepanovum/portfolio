"use client";

import { useState } from "react";
import {
  CalendarIcon,
  DocsIcon,
  DriveIcon,
  GmailIcon,
  McpIcon,
  SheetsIcon,
  SlidesIcon,
  TasksIcon,
} from "@/components/admin/app-icons";
import { LOGO_CDN, getGoogleApp, type GoogleAppKey } from "@/lib/connections/google-apps";

const FALLBACKS: Record<GoogleAppKey, (props: { className?: string }) => React.JSX.Element> = {
  gmail: GmailIcon,
  calendar: CalendarIcon,
  drive: DriveIcon,
  sheets: SheetsIcon,
  docs: DocsIcon,
  tasks: TasksIcon,
  slides: SlidesIcon,
};

/**
 * Official-looking logos from Composio's logo CDN, with the bundled SVGs as a
 * fallback so a CDN outage never leaves a blank card.
 */
export function GoogleAppIcon({ app, className }: { app: GoogleAppKey; className?: string }) {
  const [failed, setFailed] = useState(false);
  const definition = getGoogleApp(app);
  const Fallback = FALLBACKS[app];

  if (failed || !definition) {
    return <Fallback className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote SVG from a CDN; next/image adds nothing here.
    <img
      src={`${LOGO_CDN}/${definition.logoSlug}`}
      alt=""
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/** A custom MCP server shows its site's favicon, falling back to the generic MCP mark. */
export function RemoteServerIcon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  let host = "";

  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }

  if (failed || !host) {
    return <McpIcon className={`${className ?? ""} text-admin-fg`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- favicon lookup by host.
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
