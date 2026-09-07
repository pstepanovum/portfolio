/**
 * Remote MCP servers the dashboard can connect in one click. Each entry is
 * registered exactly like a hand-entered custom server, so nothing here is
 * privileged; it only saves typing the URL and picking the auth mode.
 */
export type MarketplaceStatus =
  /** Connect works end to end. */
  | "available"
  /** The remote rejects our callback until its operator allowlists it. */
  | "blocked"
  /** The service publishes no MCP server yet. */
  | "unavailable";

export type MarketplaceApp = {
  key: string;
  name: string;
  description: string;
  /** Streamable HTTP MCP endpoint; empty when the service has none. */
  url: string;
  website: string;
  docsUrl?: string;
  /** Composio logo CDN slug; omit to fall back to the site favicon. */
  logoSlug?: string;
  status: MarketplaceStatus;
  /** Shown under the card when the app cannot be connected right now. */
  note?: string;
};

export const MARKETPLACE_APPS: MarketplaceApp[] = [
  {
    key: "luma",
    name: "Luma",
    description: "Events you host or attend, guest lists, ticket types, and calendars. Read-only.",
    url: "https://mcp.luma.com",
    website: "https://luma.com",
    docsUrl: "https://help.luma.com/p/mcp",
    logoSlug: "luma",
    status: "available",
  },
  {
    key: "robinhood-trading",
    name: "Robinhood Trading",
    description: "Portfolio, quotes, watchlists, and order placement in a Robinhood Agentic account.",
    url: "https://agent.robinhood.com/mcp/trading",
    website: "https://robinhood.com",
    docsUrl: "https://robinhood.com/us/en/support/articles/agentic-trading-overview/",
    status: "blocked",
    note: "Robinhood's sign-in only accepts callback URLs of the clients it lists (Claude, ChatGPT, Cursor, Codex, Grok). Connect works once Robinhood allowlists this dashboard's callback.",
  },
  {
    key: "eventbrite",
    name: "Eventbrite",
    description: "Events, orders, and attendees.",
    url: "",
    website: "https://www.eventbrite.com",
    logoSlug: "eventbrite",
    status: "unavailable",
    note: "Eventbrite publishes no MCP server; only community-run local servers exist, each needing a private API token.",
  },
  {
    key: "sweatpals",
    name: "Sweatpals",
    description: "Fitness community events.",
    url: "",
    website: "https://www.sweatpals.com",
    status: "unavailable",
    note: "Sweatpals publishes neither an MCP server nor a public API.",
  },
];

export function getMarketplaceApp(key: string) {
  return MARKETPLACE_APPS.find((app) => app.key === key);
}

/** Matches a registered custom server to its marketplace entry by endpoint. */
export function normalizeMcpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url.trim().replace(/\/+$/, "");
  }
}
