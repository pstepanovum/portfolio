import type { ActivityEntry } from "@/lib/mcp/activity";
import { adminBadgeClasses, adminPanelClasses } from "@/components/admin/styles";
import { formatRelative } from "@/components/admin/time";

export function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className={`${adminPanelClasses} p-6`}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl">Recent activity</h3>
        <span className={adminBadgeClasses}>{entries.length} calls</span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-admin-muted">
          No tool calls yet. Activity appears here as soon as Claude uses either MCP server.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-admin-border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${entry.ok ? "bg-[#16a34a]" : "bg-admin-danger-fg"}`}
                aria-label={entry.ok ? "succeeded" : "failed"}
              />
              <code className="text-admin-fg">{entry.tool}</code>
              <span className="text-admin-subtle">
                {entry.server === "admin" ? "admin" : "portfolio"}
                {entry.account ? ` · ${entry.account}` : ""}
              </span>
              <span className="ml-auto text-admin-subtle">
                {entry.durationMs} ms · {formatRelative(entry.createdAt)}
              </span>
              {entry.error ? (
                <span className="basis-full truncate text-admin-danger-fg" title={entry.error}>
                  {entry.error}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
