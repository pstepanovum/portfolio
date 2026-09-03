import { headers } from "next/headers";
import { McpServerView } from "@/components/admin/mcp-server-view";
import { listCustomMcpServers } from "@/lib/connections/custom-mcp";
import { GOOGLE_APPS } from "@/lib/connections/google-apps";
import { getAppToolCatalog } from "@/lib/mcp/tool-catalog";
import { listConnectedClients } from "@/lib/oauth/clients";
import { MCP_RESOURCES, getBaseUrl } from "@/lib/oauth/config";

export const dynamic = "force-dynamic";

export default async function AppsServerPage() {
  const [headerList, customServers] = await Promise.all([headers(), listCustomMcpServers()]);
  const request = { headers: headerList };
  const resource = MCP_RESOURCES.apps;

  return (
    <McpServerView
      serverKey="apps"
      name="Apps MCP"
      description="Every app connected on this dashboard — your Google accounts and any custom MCP servers — behind one connector. Tools take the account alias as a parameter; per-account locks set here override whatever a client was granted."
      url={`${getBaseUrl(request)}${resource.path}`}
      scopes={resource.scopes}
      claudeName="portfolio-apps"
      initialClients={await listConnectedClients(request, "apps")}
      appSummary={[
        ...GOOGLE_APPS.map((app) => ({ name: app.name, href: `/dashboard/connections/${app.key}`, count: getAppToolCatalog(app.key).length })),
        ...customServers.map((server) => ({ name: server.name, href: `/dashboard/connections/custom/${server.id}`, count: server.tools.length })),
      ]}
    />
  );
}
