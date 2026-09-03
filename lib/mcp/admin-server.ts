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
import { registerCustomMcpTools } from "@/lib/mcp/tools/custom";
import {
  GMAIL_SCOPE_READ,
  GMAIL_SCOPE_WRITE,
  MCP_SCOPE_TOOLS,
  hasScope,
} from "@/lib/oauth/config";
import { siteConfig } from "@/lib/seo";

const INSTRUCTIONS = `This is ${siteConfig.name}'s private admin server. It reaches the Gmail
accounts connected on the dashboard at ${siteConfig.url}/dashboard/connections.

Several mailboxes may be connected. Call list_email_accounts first, then pass
the chosen alias as \`account\` to every other tool; with a single account the
parameter may be omitted. Write tools appear only when the connection was
granted gmail:write. Sending is irreversible: confirm recipients and wording
with the user first. Prefer trash_* over delete_*_permanently, which bypasses
Trash with no recovery, and never delete permanently without an explicit
request. If a tool reports that an account needs reconnecting, say so plainly:
the fix is on the dashboard, not in another tool call.`;

/**
 * Separate from the portfolio server on purpose: its own OAuth resource, its
 * own scopes, and tokens that cannot cross over. Read tools require gmail:read
 * and write tools gmail:write, mirroring how the portfolio server is gated.
 */
export async function buildAdminMcpServer(scopes: string[], clientId: string) {
  const server = withActivityLogging(
    new McpServer(
      { name: "pavel-stepanov-admin", version: "1.0.0" },
      { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
    ),
    { server: "admin", clientId },
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

  if (hasScope(scopes, MCP_SCOPE_TOOLS)) {
    registerCustomMcpTools(server, await listCustomMcpServers());
  }

  return server;
}
