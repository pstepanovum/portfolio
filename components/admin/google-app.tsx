"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GoogleAppIcon } from "@/components/admin/google-app-icon";
import type { GoogleApp } from "@/lib/connections/google-apps";
import {
  adminBadgeClasses,
  adminDangerButtonClasses,
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import { formatRelative } from "@/components/admin/time";
import { ToolsList, type ToolRow } from "@/components/admin/tools-list";
import type { EmailConnection } from "@/types/content";

export type Notice = { tone: "success" | "error"; message: string } | null;

type Props = {
  app: GoogleApp;
  initialConnections: EmailConnection[];
  initialNotice: Notice;
  openConnect: boolean;
  googleConfigured: boolean;
  encryptionConfigured: boolean;
  callbackUrl: string;
  tools: ToolRow[];
};

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  return result?.error || fallback;
}

const STATUS_STYLES: Record<EmailConnection["status"], string> = {
  active: "border-admin-success-border bg-admin-success-bg text-admin-success-fg",
  expired: "border-admin-warning-border bg-admin-warning-bg text-admin-warning-fg",
  revoked: "border-admin-danger-border bg-admin-danger-bg text-admin-danger-fg",
};

export function GoogleAppView({
  app,
  initialConnections,
  initialNotice,
  openConnect,
  googleConfigured,
  encryptionConfigured,
  callbackUrl,
  tools,
}: Props) {
  const [connections, setConnections] = useState(initialConnections);
  const [notice, setNotice] = useState<Notice>(initialNotice);
  const [showConnect, setShowConnect] = useState(openConnect || initialConnections.length === 0);
  const [alias, setAlias] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const connectRef = useRef<HTMLDivElement>(null);

  const ready = googleConfigured && encryptionConfigured;

  useEffect(() => {
    if (openConnect) connectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [openConnect]);

  const replace = (connection: EmailConnection) =>
    setConnections((current) => current.map((item) => (item.id === connection.id ? connection : item)));

  const startGoogleFlow = async (body: { alias?: string; reconnectId?: string }) => {
    try {
      setBusyId(body.reconnectId ?? "new");
      setNotice(null);
      const response = await fetch("/api/admin/connections/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Unable to start the Google connection."));
      const { url } = (await response.json()) as { url: string };
      window.location.assign(url);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to start the Google connection." });
      setBusyId(null);
    }
  };

  const testConnection = async (connection: EmailConnection) => {
    try {
      setBusyId(connection.id);
      setNotice(null);
      const response = await fetch(`/api/admin/connections/${connection.id}/test`, { method: "POST" });
      const result = (await response.json()) as { ok: boolean; error?: string; connection?: EmailConnection; profile?: { messagesTotal: number } };
      if (result.connection) replace(result.connection);
      setNotice(
        result.ok
          ? { tone: "success", message: `${connection.email} is working (${result.profile?.messagesTotal ?? 0} messages).` }
          : { tone: "error", message: result.error ?? "The connection test failed." },
      );
    } catch {
      setNotice({ tone: "error", message: "The connection test failed." });
    } finally {
      setBusyId(null);
      setMenuId(null);
    }
  };

  const saveAlias = async (connection: EmailConnection) => {
    try {
      setBusyId(connection.id);
      setNotice(null);
      const response = await fetch(`/api/admin/connections/${connection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: renameValue }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Unable to rename the account."));
      const result = (await response.json()) as { connection: EmailConnection };
      replace(result.connection);
      setRenamingId(null);
      setNotice({ tone: "success", message: `Renamed to "${result.connection.alias}".` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to rename the account." });
    } finally {
      setBusyId(null);
    }
  };

  const setPermission = async (connection: EmailConnection, key: "write" | "destructive", value: boolean) => {
    if (key === "destructive" && value && !window.confirm(`Allow irreversible actions (permanent delete, clear, delete labels/filters/events/tasks) on ${connection.email}?`)) return;
    try {
      setBusyId(connection.id);
      setNotice(null);
      const response = await fetch(`/api/admin/connections/${connection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: { [key]: value } }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Unable to update permissions."));
      const result = (await response.json()) as { connection: EmailConnection };
      replace(result.connection);
      setNotice({ tone: "success", message: `${connection.email}: ${key === "write" ? "write access" : "irreversible actions"} ${value ? "enabled" : "disabled"}.` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to update permissions." });
    } finally {
      setBusyId(null);
    }
  };

  const disconnect = async (connection: EmailConnection) => {
    if (!window.confirm(`Disconnect ${connection.email}? Access is revoked at Google.`)) return;
    try {
      setBusyId(connection.id);
      setNotice(null);
      const response = await fetch(`/api/admin/connections/${connection.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Unable to disconnect the account."));
      setConnections((current) => current.filter((item) => item.id !== connection.id));
      setNotice({ tone: "success", message: `Disconnected ${connection.email}.` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to disconnect the account." });
    } finally {
      setBusyId(null);
      setMenuId(null);
    }
  };

  const activeCount = connections.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-admin-subtle">
        <Link href="/dashboard/connections" className="hover:text-admin-fg">All Apps</Link>
        <span className="mx-2">/</span>
        <span className="text-admin-fg">{app.name}</span>
      </nav>

      <section className={`${adminPanelClasses} flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center border border-admin-border bg-admin-inset">
            <GoogleAppIcon app={app.key} className="h-8 w-8" />
          </span>
          <div>
            <h2 className="text-3xl tracking-tight">{app.name}</h2>
            <p className="text-sm text-admin-muted">
              {activeCount} active · {connections.length} connected · {tools.length} tools
            </p>
          </div>
        </div>
        <button type="button" className={adminPrimaryButtonClasses} onClick={() => setShowConnect(true)} disabled={!ready}>
          Connect New
        </button>
      </section>

      {notice ? (
        <div className={`border px-4 py-3 text-sm ${notice.tone === "success" ? "border-admin-success-border bg-admin-success-bg text-admin-success-fg" : "border-admin-danger-border bg-admin-danger-bg text-admin-danger-fg"}`}>
          {notice.message}
        </div>
      ) : null}

      {!ready ? (
        <section className={`${adminPanelClasses} p-6`}>
          <span className={adminBadgeClasses}>Setup required</span>
          <p className="mt-4 text-sm text-admin-muted">
            Set <code className="text-admin-fg">GOOGLE_OAUTH_CLIENT_ID</code>,{" "}
            <code className="text-admin-fg">GOOGLE_OAUTH_CLIENT_SECRET</code>, and{" "}
            <code className="text-admin-fg">CONNECTIONS_ENCRYPTION_KEY</code>, and register this redirect URI on the OAuth client:
          </p>
          <code className="mt-2 block break-all border border-admin-border bg-admin-inset px-3 py-2 text-admin-fg">{callbackUrl}</code>
        </section>
      ) : null}

      {showConnect ? (
        <section ref={connectRef} className={`${adminPanelClasses} p-6`}>
          <h3 className="text-xl">{connections.length === 0 ? "Connect a Google account" : "Connect another account"}</h3>
          <p className="mt-2 text-sm text-admin-muted">
            You will be sent to Google to choose the account and approve access. The alias is how
            Claude refers to it; leave it blank to use the part before the @.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="alias" className={adminLabelClasses}>Alias (optional)</label>
              <input id="alias" className={adminInputClasses} placeholder="work, personal, relvema..." value={alias} onChange={(e) => setAlias(e.target.value)} disabled={!ready || busyId !== null} maxLength={40} />
            </div>
            <button type="button" className={`${adminPrimaryButtonClasses} whitespace-nowrap`} onClick={() => startGoogleFlow({ alias: alias.trim() || undefined })} disabled={!ready || busyId !== null}>
              {busyId === "new" ? "Redirecting..." : "Connect with Google"}
            </button>
            {connections.length > 0 ? (
              <button type="button" className={adminSecondaryButtonClasses} onClick={() => setShowConnect(false)} disabled={busyId !== null}>Cancel</button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={`${adminPanelClasses} relative p-6 ${menuId ? "z-30" : ""}`}>
        {menuId ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuId(null)}
          />
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl">Connected Accounts <span className="text-admin-subtle">({connections.length})</span></h3>
            <p className="mt-1 text-xs text-admin-subtle">One Google connection serves every Google app on this dashboard.</p>
          </div>
          {!showConnect ? (
            <button type="button" className={adminSecondaryButtonClasses} onClick={() => setShowConnect(true)} disabled={!ready}>
              Connect another account
            </button>
          ) : null}
        </div>

        {connections.length === 0 ? (
          <p className="mt-4 text-admin-muted">No accounts connected yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-admin-border">
            {connections.map((connection) => {
              const busy = busyId === connection.id;
              return (
                <li key={connection.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`border px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] ${STATUS_STYLES[connection.status]}`}>{connection.status}</span>
                      <span className="text-xs text-admin-subtle">{formatRelative(connection.lastUsedAt ?? connection.connectedAt)}</span>
                    </div>
                    {renamingId === connection.id ? (
                      <div className="flex gap-2">
                        <input className={adminInputClasses} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={40} disabled={busy} />
                        <button type="button" className={adminPrimaryButtonClasses} onClick={() => saveAlias(connection)} disabled={busy}>Save</button>
                        <button type="button" className={adminSecondaryButtonClasses} onClick={() => setRenamingId(null)} disabled={busy}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="text-lg text-admin-fg">{connection.alias}</div>
                        <div className="text-sm text-admin-muted">{connection.email}</div>
                      </>
                    )}
                    <div className="flex flex-wrap gap-4 pt-1 text-sm">
                      {([
                        ["write", "Write access", "send, draft, label, trash, create, update"],
                        ["destructive", "Irreversible actions", "permanent delete, clear, delete labels/filters/events/tasks"],
                      ] as const).map(([key, label, hint]) => (
                        <label key={key} className="flex cursor-pointer items-center gap-2" title={hint}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-admin-accent"
                            checked={connection.permissions[key]}
                            disabled={busy || (key === "destructive" && !connection.permissions.write)}
                            onChange={(event) => setPermission(connection, key, event.target.checked)}
                          />
                          <span className={connection.permissions[key] ? "text-admin-fg" : "text-admin-muted"}>{label}</span>
                        </label>
                      ))}
                      {!connection.permissions.write ? (
                        <span className="border border-admin-success-border bg-admin-success-bg px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-admin-success-fg">read-only</span>
                      ) : null}
                    </div>
                    {connection.needsReconsent ? (
                      <p className="text-sm text-admin-warning-fg">Connected with a narrower permission set — reconnect to grant full access.</p>
                    ) : null}
                    {connection.lastError ? <p className="text-sm text-admin-warning-fg">{connection.lastError}</p> : null}
                  </div>

                  <div className="relative flex shrink-0 gap-2">
                    <button type="button" className={adminSecondaryButtonClasses} onClick={() => startGoogleFlow({ reconnectId: connection.id })} disabled={busy || !ready}>
                      {busy ? "Working..." : "Reconnect"}
                    </button>
                    <button type="button" className={adminSecondaryButtonClasses} onClick={() => setMenuId(menuId === connection.id ? null : connection.id)} disabled={busy} aria-label="More actions">⋯</button>
                    {menuId === connection.id ? (
                      <div className={`${adminPanelClasses} absolute right-0 top-full z-20 mt-2 flex w-44 flex-col shadow-xl`}>
                        <button type="button" className="px-4 py-2 text-left text-sm hover:bg-admin-hover" onClick={() => testConnection(connection)}>Test</button>
                        <button type="button" className="px-4 py-2 text-left text-sm hover:bg-admin-hover" onClick={() => { setRenamingId(connection.id); setRenameValue(connection.alias); setMenuId(null); }}>Rename</button>
                        <button type="button" className={`${adminDangerButtonClasses} justify-start border-0`} onClick={() => disconnect(connection)}>Disconnect</button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ToolsList tools={tools} />

      <p className="text-sm text-admin-muted">
        These tools are served through the{" "}
        <Link href="/dashboard/connections/apps" className="text-admin-fg underline underline-offset-4">Apps MCP server</Link>.
        While the Google app is in Testing status, refresh tokens expire after seven days; an account that stops working shows as{" "}
        <span className="text-admin-fg">expired</span> and needs Reconnect.
      </p>
    </div>
  );
}
