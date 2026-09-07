"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLogo } from "@/components/admin/google-app-icon";
import { adminPanelClasses, adminSecondaryButtonClasses } from "@/components/admin/styles";
import type { CustomMcpServer } from "@/lib/connections/custom-mcp";
import { MARKETPLACE_APPS, normalizeMcpUrl, type MarketplaceApp } from "@/lib/connections/marketplace";

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  return result?.error || fallback;
}

function MarketplaceCard({ app, existing }: { app: MarketplaceApp; existing?: CustomMcpServer }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/custom-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: app.name, url: app.url, authType: "oauth" }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, `Unable to connect ${app.name}.`));
      }

      const { authorizeUrl } = (await response.json()) as { authorizeUrl?: string };

      if (!authorizeUrl) {
        throw new Error(`${app.name} did not ask for sign-in; add it as a custom server instead.`);
      }

      window.location.assign(authorizeUrl);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : `Unable to connect ${app.name}.`);
      setBusy(false);
    }
  };

  const statusLine = existing
    ? existing.status === "active"
      ? `${existing.tools.length} tool${existing.tools.length === 1 ? "" : "s"} · connected`
      : existing.status === "pending"
        ? "Sign-in not completed"
        : existing.status === "reauth"
          ? "Needs reconnect"
          : `Error · ${existing.lastError ?? "unreachable"}`
    : app.status === "available"
      ? "Sign in at the remote once"
      : app.status === "blocked"
        ? "Waiting on the provider"
        : "No MCP server yet";

  return (
    <div className={`${adminPanelClasses} flex flex-col gap-4 p-4`}>
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-admin-border bg-admin-inset">
          <AppLogo slug={app.logoSlug} url={app.url || app.website} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-admin-fg">{app.name}</span>
            <span className="border border-admin-border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-admin-muted">
              MCP
            </span>
          </div>
          <p className="mt-1 text-sm text-admin-muted">{app.description}</p>
          <p className="mt-1 text-xs text-admin-subtle">{statusLine}</p>
        </div>
      </div>

      {app.note && !existing ? <p className="text-xs text-admin-subtle">{app.note}</p> : null}
      {error ? (
        <div className="border border-admin-danger-border bg-admin-danger-bg px-3 py-2 text-xs text-admin-danger-fg">{error}</div>
      ) : null}

      <div className="mt-auto flex items-center gap-3">
        {existing ? (
          <Link href={`/dashboard/connections/custom/${existing.id}`} className={adminSecondaryButtonClasses}>
            {existing.status === "active" ? "Open" : "Fix"}
          </Link>
        ) : app.status === "available" ? (
          <button type="button" className={adminSecondaryButtonClasses} onClick={connect} disabled={busy}>
            {busy ? "Preparing sign-in..." : "Connect"}
          </button>
        ) : (
          <span className="border border-admin-border px-4 py-2 text-sm text-admin-subtle">
            {app.status === "blocked" ? "Blocked by provider" : "Not available"}
          </span>
        )}
        {app.docsUrl ? (
          <a href={app.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-admin-muted underline-offset-4 hover:underline">
            Docs
          </a>
        ) : (
          <a href={app.website} target="_blank" rel="noreferrer" className="text-xs text-admin-muted underline-offset-4 hover:underline">
            Website
          </a>
        )}
      </div>
    </div>
  );
}

/** One-click connections for known remote MCP servers; each becomes a regular custom server. */
export function Marketplace({ customServers, query }: { customServers: CustomMcpServer[]; query: string }) {
  const needle = query.trim().toLowerCase();
  const apps = MARKETPLACE_APPS.filter((app) => !needle || app.name.toLowerCase().includes(needle));

  if (apps.length === 0) {
    return null;
  }

  const byUrl = new Map(customServers.map((server) => [normalizeMcpUrl(server.url), server]));

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl tracking-tight">Marketplace</h3>
        <p className="mt-1 text-sm text-admin-muted">
          Remote MCP servers with a known address. Connect signs you in at the provider and
          registers it like any custom server.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => (
          <MarketplaceCard key={app.key} app={app} existing={app.url ? byUrl.get(normalizeMcpUrl(app.url)) : undefined} />
        ))}
      </div>
    </section>
  );
}
