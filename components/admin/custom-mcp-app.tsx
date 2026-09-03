"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { McpIcon } from "@/components/admin/app-icons";
import {
  adminDangerButtonClasses,
  adminPanelClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import { formatRelative } from "@/components/admin/time";
import { ToolsList } from "@/components/admin/tools-list";
import type { CustomMcpServer } from "@/lib/connections/custom-mcp";

export function CustomMcpApp({ initial }: { initial: CustomMcpServer }) {
  const router = useRouter();
  const [server, setServer] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/custom-mcp/${server.id}/refresh`, { method: "POST" });
      const { server: updated } = (await response.json()) as { server: CustomMcpServer };
      setServer(updated);
      setNotice(updated.status === "active" ? `Discovered ${updated.tools.length} tools.` : updated.lastError ?? "Discovery failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${server.name}? Its tools disappear from the admin MCP server.`)) return;
    setBusy(true);
    await fetch(`/api/admin/custom-mcp/${server.id}`, { method: "DELETE" });
    router.push("/dashboard/connections");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm text-admin-subtle">
        <Link href="/dashboard/connections" className="hover:text-admin-fg">All Apps</Link>
        <span className="mx-2">/</span>
        <span className="text-admin-fg">{server.name}</span>
      </nav>

      <section className={`${adminPanelClasses} flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center border border-admin-border bg-admin-inset">
            <McpIcon className="h-8 w-8 text-admin-fg" />
          </span>
          <div>
            <h2 className="text-3xl tracking-tight">{server.name}</h2>
            <p className="break-all text-sm text-admin-muted">{server.url}</p>
            <p className="text-xs text-admin-subtle">
              {server.authType === "bearer" ? "Bearer token" : "No auth"} · tools discovered {formatRelative(server.lastDiscoveredAt)} ·{" "}
              <span className={server.status === "active" ? "text-[#16a34a]" : "text-admin-danger-fg"}>{server.status}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className={adminSecondaryButtonClasses} onClick={refresh} disabled={busy}>{busy ? "Working..." : "Refresh tools"}</button>
          <button type="button" className={adminDangerButtonClasses} onClick={remove} disabled={busy}>Remove</button>
        </div>
      </section>

      {notice ? <div className="border border-admin-border bg-admin-inset px-4 py-3 text-sm text-admin-strong">{notice}</div> : null}
      {server.lastError ? <div className="border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">{server.lastError}</div> : null}

      <ToolsList
        tools={server.tools.map((tool) => ({
          name: `${server.slug}__${tool.name}`,
          title: tool.title ?? tool.name,
          description: tool.description ?? "",
          badge: "mcp:tools",
        }))}
      />
    </div>
  );
}
