import { ActivityHeatmap } from "@/components/admin/activity-heatmap";
import { AppsOverview } from "@/components/admin/apps-overview";
import { RecentActivity } from "@/components/admin/recent-activity";
import { listCustomMcpServers } from "@/lib/connections/custom-mcp";
import { listPlaidItems } from "@/lib/connections/plaid-store";
import { isPlaidConfigured } from "@/lib/connections/plaid";
import { listConnections } from "@/lib/connections/store";
import { requireAdminSession } from "@/lib/firebase/auth";
import { headers } from "next/headers";
import { getActivitySummary, listRecentActivity } from "@/lib/mcp/activity";
import { listConnectedClients } from "@/lib/oauth/clients";

export const dynamic = "force-dynamic";

export default async function DashboardAppsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  const session = await requireAdminSession();

  const query = await searchParams;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const headerList = await headers();
  const request = { headers: headerList };
  const [connections, customServers, banks, summary, recent, portfolioClients, appsClients] =
    await Promise.all([
      listConnections(),
      listCustomMcpServers(),
      isPlaidConfigured() ? listPlaidItems() : Promise.resolve([]),
      getActivitySummary(),
      listRecentActivity(20),
      listConnectedClients(request, "portfolio"),
      listConnectedClients(request, "apps"),
    ]);

  const firstName =
    (typeof session?.name === "string" && session.name.split(" ")[0]) ||
    session?.email?.split("@")[0] ||
    "admin";

  return (
    <div className="space-y-6">
      <ActivityHeatmap summary={summary} greeting={`Welcome back, ${firstName}`} />
      {error ? (
        <div className="border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">{error}</div>
      ) : null}
      <AppsOverview
        connections={connections}
        customServers={customServers}
        banks={banks}
        serverClients={{ portfolio: portfolioClients.length, apps: appsClients.length }}
      />
      <RecentActivity entries={recent} />
    </div>
  );
}
