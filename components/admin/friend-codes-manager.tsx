"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  adminDangerButtonClasses,
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import type { FriendCode } from "@/lib/apps/codes-client";
import { redeemLink, type ManagedApp } from "@/lib/apps/registry";

const DAY_MS = 24 * 60 * 60 * 1000;

const DURATIONS = [
  { key: "30", label: "1 month", days: 30 },
  { key: "90", label: "3 months", days: 90 },
  { key: "365", label: "1 year", days: 365 },
  { key: "lifetime", label: "Lifetime", days: null },
  { key: "custom", label: "Custom days", days: undefined },
] as const;

type DurationKey = (typeof DURATIONS)[number]["key"];

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

function formatDate(ms: number | null | undefined) {
  if (typeof ms !== "number") return "—";
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDuration(days: number | null) {
  if (days === null) return "Lifetime";
  if (days % 365 === 0) return `${days / 365} year${days === 365 ? "" : "s"}`;
  if (days % 30 === 0) return `${days / 30} month${days === 30 ? "" : "s"}`;
  return `${days} days`;
}

function statusOf(code: FriendCode, now: number) {
  if (code.disabled) return { label: "Disabled", className: "text-admin-danger-fg" };
  if (code.expiresAt !== null && code.expiresAt <= now) return { label: "Expired", className: "text-admin-subtle" };
  if (code.redemptions >= code.maxRedemptions) return { label: "Used up", className: "text-admin-subtle" };
  return { label: "Active", className: "text-admin-fg" };
}

export function FriendCodesManager({ app, configured }: { app: ManagedApp; configured: boolean }) {
  const base = `/api/admin/apps/${app.id}/codes`;
  const [codes, setCodes] = useState<FriendCode[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [created, setCreated] = useState<FriendCode | null>(null);

  const [label, setLabel] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [duration, setDuration] = useState<DurationKey>("30");
  const [customDays, setCustomDays] = useState("14");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [redeemBy, setRedeemBy] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(base, { cache: "no-store" });
    if (!response.ok) {
      setLoadError(await readError(response, "Unable to load friend codes."));
      setCodes([]);
      return;
    }
    setLoadError(null);
    setCodes(((await response.json()) as { codes: FriendCode[] }).codes);
  }, [base]);

  useEffect(() => {
    if (configured) void load();
  }, [configured, load]);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(value);
    window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 1800);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const choice = DURATIONS.find((entry) => entry.key === duration)!;
    const durationDays = choice.days === undefined ? Number.parseInt(customDays, 10) : choice.days;
    if (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1)) {
      setError("Enter a whole number of days.");
      return;
    }
    // The redeem-by date counts through the end of that day, in this browser's time zone.
    const expiresAt = redeemBy ? new Date(`${redeemBy}T23:59:59`).getTime() : null;
    if (expiresAt !== null && expiresAt <= Date.now()) {
      setError("The redeem-by date must be in the future.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          code: customCode.trim() || undefined,
          durationDays,
          maxRedemptions: Number.parseInt(maxRedemptions, 10),
          expiresAt,
        }),
      });
      if (!response.ok) throw new Error(await readError(response, "Unable to create the code."));
      const { code } = (await response.json()) as { code: FriendCode };
      setCreated(code);
      setLabel("");
      setCustomCode("");
      setRedeemBy("");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create the code.");
    } finally {
      setBusy(false);
    }
  };

  const toggleDisabled = async (code: FriendCode) => {
    if (!code.disabled && !window.confirm(`Disable ${code.code}? Nobody new can redeem it; existing grants are kept.`)) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`${base}/${code.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: !code.disabled }),
    });
    if (!response.ok) setError(await readError(response, "Unable to update the code."));
    await load();
    setBusy(false);
  };

  const revoke = async (code: FriendCode, uid: string, who: string) => {
    if (!window.confirm(`Revoke ${code.code} for ${who}? Their Plus from this code ends now.`)) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`${base}/${code.id}/redemptions/${encodeURIComponent(uid)}`, { method: "DELETE" });
    if (!response.ok) setError(await readError(response, "Unable to revoke the redemption."));
    await load();
    setBusy(false);
  };

  if (!configured) {
    return (
      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">Friend codes</h3>
        <p className="mt-2 text-sm text-admin-muted">
          Set <code>{app.secretEnv}</code> to {app.name}&apos;s <code>cron-secret</code> to manage codes here.
        </p>
      </section>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">New friend code</h3>
        <p className="mt-1 max-w-2xl text-sm text-admin-muted">
          Share the link; friends redeem it on {app.baseUrl.replace("https://", "")}/redeem while signed in, and Plus
          turns on for their account everywhere.
        </p>

        <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className={adminLabelClasses}>Label</span>
            <input className={adminInputClasses} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Beta testers" maxLength={80} required />
          </label>
          <label className="block">
            <span className={adminLabelClasses}>Custom code (optional)</span>
            <input
              className={`${adminInputClasses} font-mono uppercase`}
              value={customCode}
              onChange={(event) => setCustomCode(event.target.value)}
              placeholder={`${app.id.toUpperCase()}-XXXX-XXXX`}
              maxLength={40}
            />
          </label>
          <label className="block">
            <span className={adminLabelClasses}>Duration</span>
            <select className={adminInputClasses} value={duration} onChange={(event) => setDuration(event.target.value as DurationKey)}>
              {DURATIONS.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          {duration === "custom" ? (
            <label className="block">
              <span className={adminLabelClasses}>Days</span>
              <input className={adminInputClasses} type="number" min={1} max={3650} value={customDays} onChange={(event) => setCustomDays(event.target.value)} required />
            </label>
          ) : null}
          <label className="block">
            <span className={adminLabelClasses}>Max redemptions</span>
            <input className={adminInputClasses} type="number" min={1} max={10000} value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} required />
          </label>
          <label className="block">
            <span className={adminLabelClasses}>Redeem by (optional)</span>
            <input
              className={adminInputClasses}
              type="date"
              value={redeemBy}
              min={new Date(now + DAY_MS).toISOString().slice(0, 10)}
              onChange={(event) => setRedeemBy(event.target.value)}
            />
          </label>
          <div className="flex items-end md:col-span-2 xl:col-span-3">
            <button type="submit" className={adminPrimaryButtonClasses} disabled={busy || !label.trim()}>
              {busy ? "Working…" : "Create code"}
            </button>
          </div>
        </form>

        {error ? <p className="mt-4 text-sm text-admin-danger-fg">{error}</p> : null}

        {created ? (
          <div className="mt-5 border border-admin-border bg-admin-inset p-4">
            <p className="text-sm text-admin-muted">Created {created.label}</p>
            <p className="mt-1 font-mono text-lg text-admin-fg">{created.code}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={adminSecondaryButtonClasses} onClick={() => copy(created.code)}>
                {copied === created.code ? "Copied" : "Copy code"}
              </button>
              <button type="button" className={adminSecondaryButtonClasses} onClick={() => copy(redeemLink(app, created.code))}>
                {copied === redeemLink(app, created.code) ? "Copied" : "Copy share link"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${adminPanelClasses} p-6`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl">
            Codes <span className="text-admin-subtle">({codes?.length ?? 0})</span>
          </h3>
          <button type="button" className={adminSecondaryButtonClasses} onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </div>

        {loadError ? <p className="mt-4 text-sm text-admin-danger-fg">{loadError}</p> : null}
        {codes === null ? <p className="mt-4 text-sm text-admin-muted">Loading…</p> : null}
        {codes?.length === 0 && !loadError ? <p className="mt-4 text-sm text-admin-muted">No codes yet.</p> : null}

        {codes && codes.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.15em] text-admin-muted">
                <tr className="border-b border-admin-border">
                  <th className="py-3 pr-4 font-normal">Code</th>
                  <th className="py-3 pr-4 font-normal">Label</th>
                  <th className="py-3 pr-4 font-normal">Duration</th>
                  <th className="py-3 pr-4 font-normal">Redeemed</th>
                  <th className="py-3 pr-4 font-normal">Redeem by</th>
                  <th className="py-3 pr-4 font-normal">Status</th>
                  <th className="py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => {
                  const status = statusOf(code, now);
                  const link = redeemLink(app, code.code);
                  const open = expanded === code.id;
                  return (
                    <Fragment key={code.id}>
                      <tr className="border-b border-admin-border align-middle">
                        <td className="py-3 pr-4 font-mono text-admin-fg">{code.code}</td>
                        <td className="py-3 pr-4 text-admin-strong">{code.label}</td>
                        <td className="py-3 pr-4">{formatDuration(code.durationDays)}</td>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            className="underline-offset-4 hover:underline disabled:no-underline"
                            onClick={() => setExpanded(open ? null : code.id)}
                            disabled={code.redemptionList.length === 0}
                          >
                            {code.redemptions} / {code.maxRedemptions}
                          </button>
                        </td>
                        <td className="py-3 pr-4">{code.expiresAt === null ? "No limit" : formatDate(code.expiresAt)}</td>
                        <td className={`py-3 pr-4 ${status.className}`}>{status.label}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" className={adminSecondaryButtonClasses} onClick={() => copy(code.code)}>
                              {copied === code.code ? "Copied" : "Copy"}
                            </button>
                            <button type="button" className={adminSecondaryButtonClasses} onClick={() => copy(link)}>
                              {copied === link ? "Copied" : "Link"}
                            </button>
                            <button
                              type="button"
                              className={code.disabled ? adminSecondaryButtonClasses : adminDangerButtonClasses}
                              onClick={() => toggleDisabled(code)}
                              disabled={busy}
                            >
                              {code.disabled ? "Enable" : "Disable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-admin-border bg-admin-inset">
                          <td colSpan={7} className="px-4 py-3">
                            <ul className="space-y-2">
                              {code.redemptionList.map((entry) => (
                                <li key={entry.uid} className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="min-w-0">
                                    <span className="text-admin-fg">{entry.email ?? entry.uid}</span>
                                    <span className="block text-xs text-admin-subtle">
                                      Redeemed {formatDate(entry.redeemedAt)} · Plus{" "}
                                      {entry.grantExpiresAt === null ? "for life" : `until ${formatDate(entry.grantExpiresAt)}`}
                                      {entry.revokedAt ? ` · revoked ${formatDate(entry.revokedAt)}` : ""}
                                    </span>
                                  </span>
                                  {entry.revokedAt ? (
                                    <span className="text-xs text-admin-subtle">Revoked</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className={adminDangerButtonClasses}
                                      onClick={() => revoke(code, entry.uid, entry.email ?? entry.uid)}
                                      disabled={busy}
                                    >
                                      Revoke
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
