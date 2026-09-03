import { headers } from "next/headers";
import { McpServerView } from "@/components/admin/mcp-server-view";
import { getPortfolioToolCatalog } from "@/lib/mcp/tool-catalog";
import { listConnectedClients } from "@/lib/oauth/clients";
import { MCP_RESOURCES, getBaseUrl } from "@/lib/oauth/config";

export const dynamic = "force-dynamic";

export default async function PortfolioServerPage() {
  const headerList = await headers();
  const request = { headers: headerList };
  const resource = MCP_RESOURCES.portfolio;

  return (
    <McpServerView
      serverKey="portfolio"
      name="Portfolio MCP"
      description="Your public portfolio content — projects, certifications, timeline, skills, and resume status — for any AI client. Clients register themselves and authenticate with OAuth 2.1; every connection is approved by you on this dashboard."
      url={`${getBaseUrl(request)}${resource.path}`}
      scopes={resource.scopes}
      claudeName="portfolio"
      initialClients={await listConnectedClients(request, "portfolio")}
      tools={getPortfolioToolCatalog().map((tool) => ({ name: tool.name, title: tool.title, description: tool.description, badge: tool.scope, destructive: tool.destructive }))}
    />
  );
}
