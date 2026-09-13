import { headers } from "next/headers";
import { McpServerView } from "@/components/admin/mcp-server-view";
import { listCustomMcpServers } from "@/lib/connections/custom-mcp";
import { isPlaidConfigured } from "@/lib/connections/plaid";
import { listPlaidItems } from "@/lib/connections/plaid-store";
import { GOOGLE_APPS } from "@/lib/connections/google-apps";
import { getAppToolCatalog, getFinanceToolCatalog } from "@/lib/mcp/tool-catalog";
import { listConnectedClients } from "@/lib/oauth/clients";
import { MCP_RESOURCES, getBaseUrl } from "@/lib/oauth/config";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function AppsServerPage() {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

  const [headerList, customServers, banks] = await Promise.all([
    headers(),
    listCustomMcpServers(),
    isPlaidConfigured() ? listPlaidItems() : Promise.resolve([]),
  ]);
  const request = { headers: headerList };
  const resource = MCP_RESOURCES.apps;

  return (
    <McpServerView
      serverKey="apps"
      name="Apps MCP"
      description="Every app connected on this dashboard, your Google accounts, linked banks, and any custom MCP servers, behind one connector. Tools take the account alias as a parameter; per-account locks set here override whatever a client was granted. Bank tools are read-only and appear only when finance:read is granted."
      url={`${getBaseUrl(request)}${resource.path}`}
      scopes={resource.scopes}
      claudeName="portfolio-apps"
      initialClients={await listConnectedClients(request, "apps")}
      appSummary={[
        ...GOOGLE_APPS.map((app) => ({ name: app.name, href: `/dashboard/connections/${app.key}`, count: getAppToolCatalog(app.key).length })),
        ...(banks.length > 0
          ? [{ name: "Banks", href: "/dashboard/connections/plaid", count: getFinanceToolCatalog().length }]
          : []),
        ...customServers.map((server) => ({ name: server.name, href: `/dashboard/connections/custom/${server.id}`, count: server.tools.length })),
      ]}
    />
  );
}
