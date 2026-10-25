"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminBadgeClasses,
  adminInsetPanelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
  adminTextareaClasses,
} from "@/components/admin/styles";
import type { ManagedApp } from "@/lib/apps/registry";
import type { SupportRequest, SupportStatus } from "@/lib/apps/support-client";

type Filter = SupportStatus | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "answered", label: "Answered" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

const TOPICS: Record<string, string> = {
  help: "Something isn't working",
  billing: "Plus or billing",
  account: "Account or data",
  content: "A lesson, answer or sound",
  idea: "An idea",
};

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

function formatDateTime(ms: number | undefined) {
  if (typeof ms !== "number" || !ms) return "—";
  return new Date(ms).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * The app's contact-form messages: read them, answer by email (sent by the app
 * from its own support address, so replies come back to that inbox), and mark
 * them open, answered, or closed.
 */
export function SupportRequestsManager({ app, configured }: { app: ManagedApp; configured: boolean }) {
  const base = `/api/admin/apps/${app.id}/support`;
  const [filter, setFilter] = useState<Filter>("open");
  const [requests, setRequests] = useState<SupportRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(filter === "all" ? base : `${base}?status=${filter}`, { cache: "no-store" });
    if (!response.ok) {
      setLoadError(await readError(response, "Unable to load support requests."));
      setRequests([]);
      return;
    }
    setLoadError(null);
    setRequests(((await response.json()) as { requests: SupportRequest[] }).requests);
  }, [base, filter]);

  useEffect(() => {
    if (configured) void load();
  }, [configured, load]);

  const replace = (updated: SupportRequest) => {
    setRequests((current) => {
      if (!current) return current;
      // A request that no longer matches the filter leaves the list.
      if (filter !== "all" && updated.status !== filter) return current.filter((entry) => entry.id !== updated.id);
      return current.map((entry) => (entry.id === updated.id ? updated : entry));
    });
  };

  const setStatus = async (request: SupportRequest, status: SupportStatus) => {
    setBusy(request.id);
    setError(null);
    const response = await fetch(`${base}/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) replace(((await response.json()) as { request: SupportRequest }).request);
    else setError({ id: request.id, text: await readError(response, "Unable to update the request.") });
    setBusy(null);
  };

  const sendReply = async (request: SupportRequest) => {
    const message = (drafts[request.id] ?? "").trim();
    if (message.length < 2) {
      setError({ id: request.id, text: "Write a reply first." });
      return;
    }
    if (!window.confirm(`Email this reply to ${request.email}?`)) return;
    setBusy(request.id);
    setError(null);
    const response = await fetch(`${base}/${request.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (response.ok) {
      setDrafts((current) => ({ ...current, [request.id]: "" }));
      replace(((await response.json()) as { request: SupportRequest }).request);
    } else {
      setError({ id: request.id, text: await readError(response, "Unable to send the reply.") });
    }
    setBusy(null);
  };

  if (!configured) {
    return (
      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">Support</h3>
        <p className="mt-2 text-sm text-admin-muted">
          Set <code>{app.secretEnv}</code> to {app.name}&apos;s <code>{app.secretName ?? "cron-secret"}</code> to read and answer support requests here.
        </p>
      </section>
    );
  }

  return (
    <section className={`${adminPanelClasses} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl">Support</h3>
          <p className="mt-1 max-w-2xl text-sm text-admin-muted">
            Messages from the contact form on {app.baseUrl.replace("https://", "")}. A reply is emailed by {app.name} from its support address, so
            answers come back to that inbox.
          </p>
        </div>
        <button type="button" className={adminSecondaryButtonClasses} onClick={() => void load()} disabled={busy !== null}>
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Status">
        {FILTERS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={filter === entry.key}
            className={filter === entry.key ? adminPrimaryButtonClasses : adminSecondaryButtonClasses}
            onClick={() => {
              setRequests(null);
              setFilter(entry.key);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {loadError ? <p className="mt-4 text-sm text-admin-danger-fg">{loadError}</p> : null}
      {requests === null ? <p className="mt-4 text-sm text-admin-muted">Loading…</p> : null}
      {requests?.length === 0 && !loadError ? <p className="mt-4 text-sm text-admin-muted">Nothing here.</p> : null}

      {requests && requests.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {requests.map((request) => {
            const open = expanded === request.id;
            return (
              <li key={request.id} className={`${adminInsetPanelClasses} p-4`}>
                <button type="button" className="flex w-full flex-wrap items-start justify-between gap-3 text-left" onClick={() => setExpanded(open ? null : request.id)} aria-expanded={open}>
                  <span className="min-w-0">
                    <span className="block text-admin-fg">
                      {request.name ? `${request.name} · ` : ""}
                      {request.email}
                    </span>
                    <span className="block text-xs text-admin-subtle">
                      {TOPICS[request.topic] ?? request.topic} · {formatDateTime(request.createdAt)}
                      {request.platform ? ` · ${request.platform}` : ""}
                      {request.uid ? " · signed in" : ""}
                    </span>
                    {!open ? <span className="mt-1 line-clamp-2 block text-sm text-admin-muted">{request.message}</span> : null}
                  </span>
                  <span className={adminBadgeClasses}>{request.status}</span>
                </button>

                {open ? (
                  <div className="mt-4 space-y-4">
                    <p className="whitespace-pre-wrap text-sm text-admin-strong">{request.message}</p>
                    <p className="text-xs text-admin-subtle">
                      Request {request.id}
                      {request.uid ? ` · account ${request.uid}` : ""}
                      {request.userAgent ? ` · ${request.userAgent}` : ""}
                    </p>

                    {request.replies.length > 0 ? (
                      <ul className="space-y-2 border-l border-admin-border pl-4">
                        {request.replies.map((reply, index) => (
                          <li key={`${reply.at}-${index}`}>
                            <p className="text-xs text-admin-subtle">
                              Replied {formatDateTime(reply.at)}
                              {reply.by ? ` by ${reply.by}` : ""}
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-admin-muted">{reply.message}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <label className="block">
                      <span className="sr-only">Reply to {request.email}</span>
                      <textarea
                        className={adminTextareaClasses}
                        value={drafts[request.id] ?? ""}
                        onChange={(event) => setDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                        placeholder={`Reply to ${request.email}`}
                        maxLength={8000}
                      />
                    </label>

                    {error?.id === request.id ? <p className="text-sm text-admin-danger-fg">{error.text}</p> : null}

                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={adminPrimaryButtonClasses} onClick={() => void sendReply(request)} disabled={busy !== null}>
                        {busy === request.id ? "Working…" : "Send reply"}
                      </button>
                      {request.status !== "answered" ? (
                        <button type="button" className={adminSecondaryButtonClasses} onClick={() => void setStatus(request, "answered")} disabled={busy !== null}>
                          Mark answered
                        </button>
                      ) : null}
                      {request.status !== "closed" ? (
                        <button type="button" className={adminSecondaryButtonClasses} onClick={() => void setStatus(request, "closed")} disabled={busy !== null}>
                          Close
                        </button>
                      ) : null}
                      {request.status !== "open" ? (
                        <button type="button" className={adminSecondaryButtonClasses} onClick={() => void setStatus(request, "open")} disabled={busy !== null}>
                          Reopen
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
