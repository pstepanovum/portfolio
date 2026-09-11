"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminDangerButtonClasses,
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import { formatRelative } from "@/components/admin/time";

type RegisteredClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt?: string;
  lastUsedAt?: string;
};

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

/**
 * Client ids for apps that cannot register themselves.
 *
 * Most clients use dynamic registration and never need this. Some, including a
 * few mobile apps, ask for a client id up front instead. A client id is public
 * and carries no secret here, so the thing that actually binds an app is the
 * redirect URI, which the authorize endpoint matches exactly.
 */
export function OAuthClients() {
  const [clients, setClients] = useState<RegisteredClient[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/oauth-clients");

    if (!response.ok) {
      setClients([]);
      return;
    }

    const { clients: list } = (await response.json()) as { clients: RegisteredClient[] };
    setClients(list);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(value);
    window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 1800);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/oauth-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: name, redirectUris: [redirectUri] }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to issue a client id."));
      }

      const { client } = (await response.json()) as { client: RegisteredClient };
      setIssued(client.clientId);
      setName("");
      setRedirectUri("");
      setAdding(false);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to issue a client id.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (client: RegisteredClient) => {
    const confirmed = window.confirm(
      `Delete the client id for ${client.clientName}? Any app using it is signed out immediately.`,
    );

    if (!confirmed) return;

    setBusy(true);
    await fetch(`/api/admin/oauth-clients/${client.clientId}`, { method: "DELETE" });
    if (issued === client.clientId) setIssued(null);
    await load();
    setBusy(false);
  };

  return (
    <section className={`${adminPanelClasses} p-6`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl">
            Client IDs <span className="text-admin-subtle">({clients?.length ?? 0})</span>
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-admin-muted">
            Most apps register themselves automatically and need nothing here. Issue one by hand
            only for an app that asks you for a client ID. A client ID works on any of the three
            servers; what it is locked to is its callback URL.
          </p>
        </div>
        <button
          type="button"
          className={adminPrimaryButtonClasses}
          onClick={() => setAdding((value) => !value)}
          disabled={busy}
        >
          {adding ? "Cancel" : "Issue a client ID"}
        </button>
      </div>

      {adding ? (
        <form onSubmit={submit} className="mt-6 space-y-4 border border-admin-border bg-admin-inset p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="client-name" className={adminLabelClasses}>
                App name
              </label>
              <input
                id="client-name"
                className={adminInputClasses}
                placeholder="Muse"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={60}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="client-redirect" className={adminLabelClasses}>
                Callback URL
              </label>
              <input
                id="client-redirect"
                className={adminInputClasses}
                placeholder="muse://oauth/callback"
                value={redirectUri}
                onChange={(event) => setRedirectUri(event.target.value)}
                required
                disabled={busy}
                spellCheck={false}
              />
            </div>
          </div>
          <p className="text-xs text-admin-subtle">
            Copy the callback URL from the app exactly. Sign-in fails if it differs by even a
            trailing slash. A custom scheme, https, or http on localhost are all accepted.
          </p>
          {error ? (
            <div className="border border-admin-danger-border bg-admin-danger-bg px-3 py-2 text-sm text-admin-danger-fg">
              {error}
            </div>
          ) : null}
          <button type="submit" className={adminPrimaryButtonClasses} disabled={busy}>
            {busy ? "Issuing..." : "Issue"}
          </button>
        </form>
      ) : null}

      {clients === null ? (
        <p className="mt-4 text-admin-muted">Loading...</p>
      ) : clients.length === 0 ? (
        <p className="mt-4 text-admin-muted">No client IDs have been issued.</p>
      ) : (
        <ul className="mt-4 divide-y divide-admin-border">
          {clients.map((client) => (
            <li key={client.clientId} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-admin-fg">
                    {client.clientName}
                    {issued === client.clientId ? (
                      <span className="ml-2 text-xs uppercase tracking-[0.2em] text-[#16a34a]">New</span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 overflow-x-auto border border-admin-border bg-admin-inset px-2 py-1 text-xs text-admin-strong">
                      {client.clientId}
                    </code>
                    <button
                      type="button"
                      className={`${adminSecondaryButtonClasses} whitespace-nowrap px-3 py-1 text-xs`}
                      onClick={() => copy(client.clientId)}
                    >
                      {copied === client.clientId ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="mt-1 break-all text-xs text-admin-subtle">
                    {client.redirectUris.join(", ") || "No callback URL"} · created{" "}
                    {formatRelative(client.createdAt)} · last used {formatRelative(client.lastUsedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className={adminDangerButtonClasses}
                  onClick={() => remove(client)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
