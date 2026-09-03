"use client";

import { useState } from "react";
import Link from "next/link";
import {
  adminBadgeClasses,
  adminDangerButtonClasses,
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import { formatRelative } from "@/components/admin/time";
import { ToolsList, type ToolRow } from "@/components/admin/tools-list";
import type { ConnectedClient } from "@/lib/oauth/clients";
import { SCOPE_DESCRIPTIONS } from "@/lib/oauth/scope-descriptions";

type Props = {
  serverKey: "portfolio" | "apps";
  name: string;
  description: string;
  url: string;
  scopes: string[];
  claudeName: string;
  initialClients: ConnectedClient[];
  tools?: ToolRow[];
  appSummary?: { name: string; href: string; count: number }[];
};

export function McpServerView({ serverKey, name, description, url, scopes, claudeName, initialClients, tools, appSummary }: Props) {
  const [clients, setClients] = useState(initialClients);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const disconnect = async (client: ConnectedClient) => {
    if (!window.confirm(`Disconnect ${client.clientName}? It will have to authorise again to use ${name}.`)) return;
    setBusy(client.grantId);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/mcp-clients/${client.grantId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to disconnect the client.");
      setClients((current) => current.filter((c) => c.grantId !== client.grantId));
      setNotice(`Disconnected ${client.clientName}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to disconnect the client.");
    } finally {
      setBusy(null);
    }
  };

  const command = `claude mcp add --transport http ${claudeName} ${url}`;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-admin-subtle">
        <Link href="/dashboard/connections" className="hover:text-admin-fg">All Apps</Link>
        <span className="mx-2">/</span>
        <span className="text-admin-fg">{name}</span>
      </nav>

      <section className={`${adminPanelClasses} p-6`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={adminBadgeClasses}>Built-in</span>
          <span className={adminBadgeClasses}>MCP server</span>
        </div>
        <h2 className="mt-4 text-3xl tracking-tight">{name}</h2>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">{description}</p>

        <div className="mt-6">
          <label htmlFor={`${serverKey}-url`} className={adminLabelClasses}>Server URL</label>
          <div className="flex gap-2">
            <input id={`${serverKey}-url`} className={adminInputClasses} value={url} readOnly spellCheck={false} />
            <button type="button" className={`${adminSecondaryButtonClasses} whitespace-nowrap`} onClick={() => copy("url", url)}>
              {copied === "url" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Claude (web, desktop, mobile)</h4>
            <p className="mt-2 text-sm text-admin-muted">Settings → Connectors → Add custom connector → paste the URL. Sign in and approve access when prompted.</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Claude Code</h4>
            <div className="mt-2 flex gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto border border-admin-border bg-admin-inset px-3 py-2 text-xs text-admin-strong">{command}</code>
              <button type="button" className={`${adminSecondaryButtonClasses} whitespace-nowrap`} onClick={() => copy("cmd", command)}>
                {copied === "cmd" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-admin-subtle">The first tool call opens the approval page.</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Cursor, ChatGPT, others</h4>
            <p className="mt-2 text-sm text-admin-muted">Add a remote MCP server with the URL above; registration and consent happen automatically via OAuth.</p>
          </div>
        </div>
      </section>

      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">Scopes</h3>
        <ul className="mt-4 space-y-3">
          {scopes.map((scope) => (
            <li key={scope} className="text-sm">
              <code className="text-admin-fg">{scope}</code>
              <span className="text-admin-muted"> — {SCOPE_DESCRIPTIONS[scope] ?? ""}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">Connected clients <span className="text-admin-subtle">({clients.length})</span></h3>
        {notice ? <p className="mt-3 text-sm text-admin-strong">{notice}</p> : null}
        {clients.length === 0 ? (
          <p className="mt-4 text-admin-muted">No client holds an active grant on this server.</p>
        ) : (
          <ul className="mt-4 divide-y divide-admin-border">
            {clients.map((client) => (
              <li key={client.grantId} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-admin-fg">{client.clientName}</div>
                  <div className="text-sm text-admin-muted">
                    {client.scopes.join(", ")} · connected {formatRelative(client.connectedAt)} · last used {formatRelative(client.lastUsedAt)}
                  </div>
                </div>
                <button type="button" className={adminDangerButtonClasses} onClick={() => disconnect(client)} disabled={busy === client.grantId}>
                  {busy === client.grantId ? "Working..." : "Disconnect"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {appSummary ? (
        <section className={`${adminPanelClasses} p-6`}>
          <h3 className="text-xl">Apps on this server</h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {appSummary.map((app) => (
              <li key={app.href}>
                <Link href={app.href} className="flex items-center justify-between border border-admin-border bg-admin-inset px-4 py-3 text-sm hover:bg-admin-hover">
                  <span className="text-admin-fg">{app.name}</span>
                  <span className="text-admin-subtle">{app.count} tools</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tools ? <ToolsList tools={tools} /> : null}
    </div>
  );
}
