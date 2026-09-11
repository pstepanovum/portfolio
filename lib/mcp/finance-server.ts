import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withActivityLogging } from "@/lib/mcp/activity";
import { registerPlaidReadTools } from "@/lib/mcp/tools/plaid";
import { FINANCE_SCOPE_READ, hasScope } from "@/lib/oauth/config";
import { siteConfig } from "@/lib/seo";

const INSTRUCTIONS = `This server reads the bank accounts ${siteConfig.name} has linked
through Plaid at ${siteConfig.url}/dashboard/connections/plaid.

Every tool here is read-only. Nothing on this server can move money, open or
close an account, or change anything at a bank, and no write tool exists to be
granted later.

Several banks may be linked. Call list_banks first, then pass the chosen alias
as \`bank\` to every other tool; with a single bank the parameter may be
omitted. Amounts follow Plaid's convention: positive means money left the
account, negative means money arrived. Balances from get_balances are fetched
live from the institution, while transactions can lag by a day and pending ones
may still change.

If a tool reports that a bank needs signing in again, say so plainly: consent
expires on the bank's schedule, Bank of America every twelve months, and the
fix is on the dashboard rather than in another tool call.

This is the owner's own financial data. Do not repeat account numbers or
balances into anything shared, and summarise rather than dumping full history
unless asked for it.`;

/**
 * The third MCP resource, separate from portfolio and apps on purpose.
 *
 * Tokens are audience-bound, so a connector holding mailbox or portfolio
 * access cannot call these tools, and a token minted here reaches nothing but
 * the linked banks.
 */
export function buildFinanceMcpServer(scopes: string[], clientId: string) {
  const server = withActivityLogging(
    new McpServer(
      {
        name: "pavel-stepanov-finance",
        title: "Pavel Stepanov Finance",
        version: "1.0.0",
        description:
          "Read-only balances, transactions, holdings, and liabilities from the bank accounts linked on the pstepanov.dev dashboard.",
        websiteUrl: `${siteConfig.url}/dashboard/connections/plaid`,
        icons: [{ src: `${siteConfig.url}/icons/mcp.svg`, mimeType: "image/svg+xml", sizes: ["any"] }],
      },
      { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
    ),
    { server: "finance", clientId },
  );

  if (hasScope(scopes, FINANCE_SCOPE_READ)) {
    registerPlaidReadTools(server);
  }

  return server;
}
