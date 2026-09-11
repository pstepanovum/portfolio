import { headers } from "next/headers";
import { McpServerView } from "@/components/admin/mcp-server-view";
import { isPlaidConfigured } from "@/lib/connections/plaid";
import { listPlaidItems } from "@/lib/connections/plaid-store";
import { getFinanceToolCatalog } from "@/lib/mcp/tool-catalog";
import { listConnectedClients } from "@/lib/oauth/clients";
import { MCP_RESOURCES, getBaseUrl } from "@/lib/oauth/config";

export const dynamic = "force-dynamic";

export default async function FinanceServerPage() {
  const [headerList, banks] = await Promise.all([
    headers(),
    isPlaidConfigured() ? listPlaidItems() : Promise.resolve([]),
  ]);
  const request = { headers: headerList };
  const resource = MCP_RESOURCES.finance;

  return (
    <McpServerView
      serverKey="finance"
      name="Finance MCP"
      description="Balances, transactions, holdings, and liabilities from the banks linked through Plaid. Its own resource and its own scope, so a token for this server reaches nothing else and a token for another server cannot reach it. Read-only throughout: no tool here can move money."
      url={`${getBaseUrl(request)}${resource.path}`}
      scopes={resource.scopes}
      claudeName="portfolio-finance"
      initialClients={await listConnectedClients(request, "finance")}
      tools={getFinanceToolCatalog().map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        badge: tool.scope,
      }))}
      appSummary={banks.map((bank) => ({
        name: bank.institutionName,
        href: "/dashboard/connections/plaid",
        count: bank.accounts.length,
      }))}
    />
  );
}
