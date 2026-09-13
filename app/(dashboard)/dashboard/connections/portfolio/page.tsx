import { headers } from "next/headers";
import { McpServerView } from "@/components/admin/mcp-server-view";
import { getPortfolioToolCatalog } from "@/lib/mcp/tool-catalog";
import { listConnectedClients } from "@/lib/oauth/clients";
import { MCP_RESOURCES, getBaseUrl } from "@/lib/oauth/config";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function PortfolioServerPage() {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

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
