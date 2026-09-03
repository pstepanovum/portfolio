"use client";

import { useState } from "react";
import {
  adminBadgeClasses,
  adminDangerButtonClasses,
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import type { EmailConnection } from "@/types/content";

export type ConnectionNotice = {
  tone: "success" | "error";
  message: string;
} | null;

type ConnectionsManagerProps = {
  initialConnections: EmailConnection[];
  initialNotice: ConnectionNotice;
  googleConfigured: boolean;
  encryptionConfigured: boolean;
  callbackUrl: string;
  adminMcpUrl: string;
};

function formatDateTime(value?: string) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return result?.error || fallback;
}

const STATUS_STYLES: Record<EmailConnection["status"], string> = {
  active: "border-admin-success-border bg-admin-success-bg text-admin-success-fg",
  expired: "border-admin-warning-border bg-admin-warning-bg text-admin-warning-fg",
  revoked: "border-admin-danger-border bg-admin-danger-bg text-admin-danger-fg",
};

export default function ConnectionsManager({
  initialConnections,
  initialNotice,
  googleConfigured,
  encryptionConfigured,
  callbackUrl,
  adminMcpUrl,
}: ConnectionsManagerProps) {
  const [connections, setConnections] = useState(initialConnections);
  const [notice, setNotice] = useState<ConnectionNotice>(initialNotice);
  const [alias, setAlias] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const ready = googleConfigured && encryptionConfigured;

  const replace = (connection: EmailConnection) =>
    setConnections((current) =>
      current.map((item) => (item.id === connection.id ? connection : item)),
    );

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {
      setNotice({ tone: "error", message: "Copy failed. Try again in a secure tab." });
    }
  };

  /** Both connect and reconnect end by handing the browser to Google. */
  const startGoogleFlow = async (body: { alias?: string; reconnectId?: string }) => {
    try {
      setBusyId(body.reconnectId ?? "new");
      setNotice(null);

      const response = await fetch("/api/admin/connections/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Unable to start the Google connection."));
      }

      const { url } = (await response.json()) as { url: string };
      window.location.assign(url);
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to start the Google connection.",
      });
      setBusyId(null);
    }
  };

  const testConnection = async (connection: EmailConnection) => {
    try {
      setBusyId(connection.id);
      setNotice(null);

      const response = await fetch(`/api/admin/connections/${connection.id}/test`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        connection?: EmailConnection;
        profile?: { messagesTotal: number };
      };

      if (result.connection) {
        replace(result.connection);
      }

      setNotice(
        result.ok
          ? {
              tone: "success",
              message: `${connection.email} is working (${result.profile?.messagesTotal ?? 0} messages in the mailbox).`,
            }
          : { tone: "error", message: result.error ?? "The connection test failed." },
      );
    } catch {
      setNotice({ tone: "error", message: "The connection test failed." });
    } finally {
      setBusyId(null);
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

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Unable to rename the account."));
      }

      const result = (await response.json()) as { connection: EmailConnection };
      replace(result.connection);
      setRenamingId(null);
      setNotice({ tone: "success", message: `Renamed to "${result.connection.alias}".` });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to rename the account.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const disconnect = async (connection: EmailConnection) => {
    if (!window.confirm(`Disconnect ${connection.email}? Access is revoked at Google.`)) {
      return;
    }

    try {
      setBusyId(connection.id);
      setNotice(null);

      const response = await fetch(`/api/admin/connections/${connection.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Unable to disconnect the account."));
      }

      setConnections((current) => current.filter((item) => item.id !== connection.id));
      setNotice({ tone: "success", message: `Disconnected ${connection.email}.` });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to disconnect the account.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Connections</span>
        <h2 className="mt-4 text-3xl tracking-tight">Connected accounts</h2>
        <p className="mt-3 max-w-3xl text-admin-muted">
          Connect as many Gmail accounts as you like. Each gets an alias, and the
          admin MCP server exposes all of them to Claude through a single
          connector; tools take the alias as their <code className="text-admin-fg">account</code>{" "}
          parameter.
        </p>
      </section>

      {notice ? (
        <div
          className={`border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-admin-success-border bg-admin-success-bg text-admin-success-fg"
              : "border-admin-danger-border bg-admin-danger-bg text-admin-danger-fg"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {!ready ? (
        <section className={`${adminPanelClasses} p-6`}>
          <span className={adminBadgeClasses}>Setup required</span>
          <h3 className="mt-4 text-xl">Finish configuring Google OAuth</h3>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-admin-muted">
            <li>
              In Google Cloud Console for this project, enable the{" "}
              <span className="text-admin-fg">Gmail API</span>.
            </li>
            <li>
              Configure the OAuth consent screen as <span className="text-admin-fg">External</span>,
              leave it in <span className="text-admin-fg">Testing</span>, and add each Gmail address
              you will connect as a test user.
            </li>
            <li>
              Create an OAuth client of type <span className="text-admin-fg">Web application</span>{" "}
              with this authorised redirect URI:
              <code className="mt-2 block break-all border border-admin-border bg-admin-inset px-3 py-2 text-admin-fg">
                {callbackUrl}
              </code>
            </li>
            <li>
              Set the environment variables (locally in <code className="text-admin-fg">.env.local</code>,
              in production as App Hosting secrets):
              <code className="mt-2 block border border-admin-border bg-admin-inset px-3 py-2 text-admin-fg">
                GOOGLE_OAUTH_CLIENT_ID={googleConfigured ? "set" : "missing"}
                <br />
                GOOGLE_OAUTH_CLIENT_SECRET={googleConfigured ? "set" : "missing"}
                <br />
                CONNECTIONS_ENCRYPTION_KEY={encryptionConfigured ? "set" : "missing"}
                {"  "}# openssl rand -base64 32
              </code>
            </li>
          </ol>
        </section>
      ) : null}

      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">Connect a Gmail account</h3>
        <p className="mt-2 text-sm text-admin-muted">
          You will be sent to Google to choose the account and approve access. The
          alias is how you refer to it later; leave it blank to use the part before the @.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="alias" className={adminLabelClasses}>
              Alias (optional)
            </label>
            <input
              id="alias"
              className={adminInputClasses}
              placeholder="work, personal, relvema..."
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              disabled={!ready || busyId !== null}
              maxLength={40}
            />
          </div>
          <button
            type="button"
            className={`${adminPrimaryButtonClasses} whitespace-nowrap`}
            onClick={() => startGoogleFlow({ alias: alias.trim() || undefined })}
            disabled={!ready || busyId !== null}
          >
            {busyId === "new" ? "Redirecting..." : "Connect with Google"}
          </button>
        </div>
      </section>

      <section className={`${adminPanelClasses} p-6`}>
        {connections.length === 0 ? (
          <p className="text-admin-muted">No accounts connected yet.</p>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => {
              const busy = busyId === connection.id;

              return (
                <article
                  key={connection.id}
                  className="border border-admin-border bg-admin-inset p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`border px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] ${STATUS_STYLES[connection.status]}`}
                        >
                          {connection.status}
                        </span>
                        <span className="font-mono text-xs text-admin-subtle">
                          account: {connection.alias}
                        </span>
                      </div>
                      <h3 className="text-xl">{connection.email}</h3>
                      <dl className="grid gap-x-8 gap-y-1 text-sm text-admin-muted sm:grid-cols-2">
                        <div>
                          <dt className="inline text-admin-subtle">Connected: </dt>
                          <dd className="inline">{formatDateTime(connection.connectedAt)}</dd>
                        </div>
                        <div>
                          <dt className="inline text-admin-subtle">Last used: </dt>
                          <dd className="inline">{formatDateTime(connection.lastUsedAt)}</dd>
                        </div>
                      </dl>
                      {connection.lastError ? (
                        <p className="text-sm text-admin-warning-fg">{connection.lastError}</p>
                      ) : null}
                    </div>

                    <div className="w-full space-y-3 lg:max-w-[300px]">
                      {renamingId === connection.id ? (
                        <div className="flex gap-2">
                          <input
                            className={adminInputClasses}
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            maxLength={40}
                            disabled={busy}
                          />
                          <button
                            type="button"
                            className={adminPrimaryButtonClasses}
                            onClick={() => saveAlias(connection)}
                            disabled={busy}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={adminSecondaryButtonClasses}
                            onClick={() => setRenamingId(null)}
                            disabled={busy}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className={`${adminSecondaryButtonClasses} justify-center`}
                            onClick={() => testConnection(connection)}
                            disabled={busy}
                          >
                            {busy ? "Working..." : "Test"}
                          </button>
                          <button
                            type="button"
                            className={`${adminSecondaryButtonClasses} justify-center`}
                            onClick={() => startGoogleFlow({ reconnectId: connection.id })}
                            disabled={busy || !ready}
                          >
                            Reconnect
                          </button>
                          <button
                            type="button"
                            className={`${adminSecondaryButtonClasses} justify-center`}
                            onClick={() => {
                              setRenamingId(connection.id);
                              setRenameValue(connection.alias);
                            }}
                            disabled={busy}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className={`${adminDangerButtonClasses} justify-center`}
                            onClick={() => disconnect(connection)}
                            disabled={busy}
                          >
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Admin MCP Server</span>
        <h3 className="mt-4 text-xl">Connect Claude to these accounts</h3>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">
          A separate server from the portfolio one, with its own consent and its own
          scopes, so a portfolio connection can never reach a mailbox.
        </p>
        <div className="mt-5">
          <label htmlFor="adminMcpUrl" className={adminLabelClasses}>
            Server URL
          </label>
          <div className="flex gap-2">
            <input
              id="adminMcpUrl"
              className={adminInputClasses}
              value={adminMcpUrl}
              readOnly
              spellCheck={false}
            />
            <button
              type="button"
              className={`${adminSecondaryButtonClasses} whitespace-nowrap`}
              onClick={() => copyText("url", adminMcpUrl)}
            >
              {copied === "url" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre className="mt-4 overflow-x-auto border border-admin-border bg-admin-inset px-4 py-3 font-mono text-xs leading-6 text-admin-strong">
          {`claude mcp add --transport http portfolio-admin ${adminMcpUrl}`}
        </pre>
        <p className="mt-4 text-sm text-admin-muted">
          <code className="text-admin-fg">gmail:read</code> searches and reads mail;{" "}
          <code className="text-admin-fg">gmail:write</code> additionally sends, replies,
          drafts, and changes labels. While the Google app is in Testing status, refresh
          tokens expire after seven days; an account that stops working shows as{" "}
          <span className="text-admin-fg">expired</span> here and needs Reconnect.
        </p>
      </section>
    </div>
  );
}
