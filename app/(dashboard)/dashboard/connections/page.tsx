import { ActivityHeatmap } from "@/components/admin/activity-heatmap";
import { AppsOverview } from "@/components/admin/apps-overview";
import { RecentActivity } from "@/components/admin/recent-activity";
import { listCustomMcpServers } from "@/lib/connections/custom-mcp";
import { listConnections } from "@/lib/connections/store";
import { getAdminSession } from "@/lib/firebase/auth";
import { getActivitySummary, listRecentActivity } from "@/lib/mcp/activity";

export const dynamic = "force-dynamic";

export default async function DashboardAppsPage() {
  const [session, connections, customServers, summary, recent] = await Promise.all([
    getAdminSession(),
    listConnections(),
    listCustomMcpServers(),
    getActivitySummary(),
    listRecentActivity(20),
  ]);

  const firstName =
    (typeof session?.name === "string" && session.name.split(" ")[0]) ||
    session?.email?.split("@")[0] ||
    "admin";

  return (
    <div className="space-y-6">
      <ActivityHeatmap summary={summary} greeting={`Welcome back, ${firstName}`} />
      <AppsOverview connections={connections} customServers={customServers} />
      <RecentActivity entries={recent} />
    </div>
  );
}
