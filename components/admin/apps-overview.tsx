"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { McpIcon } from "@/components/admin/app-icons";
import { GoogleAppIcon, RemoteServerIcon } from "@/components/admin/google-app-icon";
import { GOOGLE_APPS } from "@/lib/connections/google-apps";
import { CustomMcpForm } from "@/components/admin/custom-mcp-form";
import {
  adminInputClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import type { CustomMcpServer } from "@/lib/connections/custom-mcp";
import type { EmailConnection } from "@/types/content";
import { cn } from "@/lib/utils";

type Props = {
  connections: EmailConnection[];
  customServers: CustomMcpServer[];
  serverClients: { portfolio: number; apps: number };
};

type Filter = "all" | "connected";

function AppCard({
  href,
  icon,
  name,
  status,
  action,
}: {
  href: string;
  icon: React.ReactNode;
  name: string;
  status?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${adminPanelClasses} flex items-center gap-4 p-4`}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-admin-border bg-admin-inset">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-admin-fg">{name}</span>
          {status ? <span className="block text-xs text-admin-subtle">{status}</span> : null}
        </span>
      </Link>
      {action}
    </div>
  );
}

export function AppsOverview({ connections, customServers, serverClients }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const activeGmail = connections.filter((c) => c.status === "active").length;

  const apps = useMemo(() => {
    const builtIn = [
      { key: "portfolio", name: "Portfolio MCP", href: "/dashboard/connections/portfolio", count: serverClients.portfolio, blurb: "Public portfolio content" },
      { key: "apps", name: "Apps MCP", href: "/dashboard/connections/apps", count: serverClients.apps, blurb: "Google accounts + custom servers" },
    ].map((server) => ({
      key: server.key,
      name: server.name,
      connected: server.count > 0,
      node: (
        <AppCard
          key={server.key}
          href={server.href}
          icon={<McpIcon className="h-6 w-6 text-admin-fg" />}
          name={server.name}
          status={`${server.blurb} · ${server.count} client${server.count === 1 ? "" : "s"}`}
          action={<span className="border border-admin-border px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-admin-muted">Built-in</span>}
        />
      ),
    }));

    const list = [
      ...builtIn,
      ...GOOGLE_APPS.map((app) => ({
        key: app.key,
        name: app.name,
        connected: connections.length > 0,
        node: (
          <AppCard
            key={app.key}
            href={`/dashboard/connections/${app.key}`}
            icon={<GoogleAppIcon app={app.key} className="h-6 w-6" />}
            name={app.name}
            status={
              connections.length === 0
                ? "Not connected"
                : `${activeGmail} active · ${connections.length} account${connections.length === 1 ? "" : "s"}`
            }
            action={
              <Link href={`/dashboard/connections/${app.key}?connect=1`} className={`${adminSecondaryButtonClasses} whitespace-nowrap`}>
                {connections.length === 0 ? "Connect" : "+ New"}
              </Link>
            }
          />
        ),
      })),
      ...customServers.map((server) => ({
        key: server.id,
        name: server.name,
        connected: server.status === "active",
        node: (
          <AppCard
            key={server.id}
            href={`/dashboard/connections/custom/${server.id}`}
            icon={<RemoteServerIcon url={server.url} className="h-6 w-6" />}
            name={server.name}
            status={
              server.status === "active"
                ? `${server.tools.length} tool${server.tools.length === 1 ? "" : "s"} · ${new URL(server.url).host}`
                : server.status === "pending"
                  ? "Sign-in not completed"
                  : server.status === "reauth"
                    ? "Needs reconnect"
                    : `Error · ${server.lastError ?? "unreachable"}`
            }
            action={
              <span
                className={`text-xs ${
                  server.status === "active" ? "text-[#16a34a]" : server.status === "pending" ? "text-admin-warning-fg" : "text-admin-danger-fg"
                }`}
              >
                {server.status === "active" ? "✓ Active" : server.status === "pending" ? "Pending" : server.status === "reauth" ? "Reconnect" : "Error"}
              </span>
            }
          />
        ),
      })),
    ];

    const needle = query.trim().toLowerCase();

    return list.filter(
      (app) =>
        (filter === "all" || app.connected) &&
        (!needle || app.name.toLowerCase().includes(needle)),
    );
  }, [connections, customServers, serverClients, activeGmail, filter, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-3xl tracking-tight">
          Apps <span className="text-admin-subtle">({2 + GOOGLE_APPS.length + customServers.length})</span>
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex border border-admin-border">
            {(["all", "connected"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`px-4 py-2 text-sm capitalize transition-colors ${
                  filter === value ? "bg-admin-accent text-admin-accent-fg" : "text-admin-muted hover:bg-admin-hover"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <input
            className={cn(adminInputClasses, "py-2 text-sm sm:w-56")}
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className={adminPrimaryButtonClasses} onClick={() => setAdding((v) => !v)}>
            + Add Custom MCP
          </button>
        </div>
      </div>

      {adding ? <CustomMcpForm onCancel={() => setAdding(false)} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => app.node)}
        {apps.length === 0 ? <p className="text-admin-muted">No apps match.</p> : null}
      </div>
    </div>
  );
}
