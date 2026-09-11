import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerContactsReadTools,
  registerGmailReadTools,
  registerGmailWriteTools,
} from "@/lib/mcp/tools/gmail";
import {
  registerGmailSettingsReadTools,
  registerGmailSettingsWriteTools,
} from "@/lib/mcp/tools/gmail-settings";
import { listCustomMcpServers } from "@/lib/connections/custom-mcp";
import { withActivityLogging } from "@/lib/mcp/activity";
import { WORKSPACE_REGISTRARS } from "@/lib/mcp/tool-catalog";
import { registerCustomMcpTools } from "@/lib/mcp/tools/custom";
import { registerPlaidReadTools } from "@/lib/mcp/tools/plaid";
import {
  FINANCE_SCOPE_READ,
  GMAIL_SCOPE_READ,
  GMAIL_SCOPE_WRITE,
  GOOGLE_SCOPE_READ,
  GOOGLE_SCOPE_WRITE,
  MCP_SCOPE_TOOLS,
  hasScope,
} from "@/lib/oauth/config";
import { siteConfig } from "@/lib/seo";

const INSTRUCTIONS = `This is ${siteConfig.name}'s private apps server. It reaches the Google
accounts connected on the dashboard at ${siteConfig.url}/dashboard/connections:
Gmail, Calendar, Drive, Sheets, Docs, Tasks, and Slides share each connection.
Banks linked through Plaid appear here too when finance:read was granted.

Several mailboxes may be connected. Call list_email_accounts first, then pass
the chosen alias as \`account\` to every other tool; with a single account the
parameter may be omitted. Write tools appear only when the connection was
granted gmail:write. Sending is irreversible: confirm recipients and wording
with the user first. Prefer trash_* over delete_*_permanently, which bypasses
Trash with no recovery, and never delete permanently without an explicit
request. If a tool reports that an account needs reconnecting, say so plainly:
the fix is on the dashboard, not in another tool call.

Bank tools (list_banks, get_balances, list_transactions, search_transactions,
get_recurring_transactions, get_investment_holdings, get_liabilities) are
read-only and cannot move money. They take a \`bank\` alias the same way mail
tools take an \`account\`. Amounts follow Plaid's convention: positive means
money left the account, negative means it arrived. This is the owner's own
financial data, so summarise rather than dumping full history unless asked,
and never repeat balances or account numbers into anything shared.`;

/**
 * Separate from the portfolio server on purpose: its own OAuth resource, its
 * own scopes, and tokens that cannot cross over. Read tools require gmail:read
 * and write tools gmail:write, mirroring how the portfolio server is gated.
 */
export async function buildAdminMcpServer(scopes: string[], clientId: string) {
  const server = withActivityLogging(
    new McpServer(
      {
        name: "pavel-stepanov-apps",
        title: "Pavel Stepanov Apps",
        version: "1.1.0",
        description: "Gmail, Calendar, Drive, Sheets, Docs, Tasks, Slides, linked banks, and custom MCP servers connected on the pstepanov.dev dashboard.",
        websiteUrl: `${siteConfig.url}/dashboard/connections`,
        icons: [{ src: `${siteConfig.url}/icons/mcp.svg`, mimeType: "image/svg+xml", sizes: ["any"] }],
      },
      { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
    ),
    { server: "apps", clientId },
  );

  if (hasScope(scopes, GMAIL_SCOPE_READ)) {
    registerGmailReadTools(server);
    registerGmailSettingsReadTools(server);
    registerContactsReadTools(server);
  }

  if (hasScope(scopes, GMAIL_SCOPE_WRITE)) {
    registerGmailWriteTools(server);
    registerGmailSettingsWriteTools(server);
  }

  if (hasScope(scopes, GOOGLE_SCOPE_READ)) {
    WORKSPACE_REGISTRARS.read.forEach((register) => register(server));
  }

  if (hasScope(scopes, GOOGLE_SCOPE_WRITE)) {
    WORKSPACE_REGISTRARS.write.forEach((register) => register(server));
  }

  if (hasScope(scopes, MCP_SCOPE_TOOLS)) {
    registerCustomMcpTools(server, await listCustomMcpServers());
  }

  // Bank tools are read-only and gated behind their own scope, so a connector
  // granted only mailbox access never sees them in its tool list.
  if (hasScope(scopes, FINANCE_SCOPE_READ)) {
    registerPlaidReadTools(server);
  }

  return server;
}
