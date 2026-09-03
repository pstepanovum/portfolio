"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { MfaState } from "@/lib/auth/mfa";

type Notice = { tone: "success" | "error"; message: string } | null;

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  return result?.error || fallback;
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  return (
    <section className={`${adminPanelClasses} border-admin-warning-border p-6`}>
      <span className={adminBadgeClasses}>Recovery codes</span>
      <h3 className="mt-4 text-xl">Save these now — they are shown once</h3>
      <p className="mt-2 text-sm text-admin-muted">
        Each code signs you in once if you lose your authenticator. Keep them somewhere safe and offline.
      </p>
      <pre className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 border border-admin-border bg-admin-inset px-4 py-3 font-mono text-sm text-admin-fg">
        {codes.map((code) => <span key={code}>{code}</span>)}
      </pre>
      <div className="mt-4 flex gap-3">
        <button type="button" className={adminSecondaryButtonClasses} onClick={async () => { await navigator.clipboard.writeText(text).catch(() => undefined); setCopied(true); }}>
          {copied ? "Copied" : "Copy all"}
        </button>
        <button type="button" className={adminPrimaryButtonClasses} onClick={onDone}>I have saved them</button>
      </div>
    </section>
  );
}

export function SecurityManager({ initialState, mustEnroll, email }: { initialState: MfaState; mustEnroll: boolean; email: string }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [actionCode, setActionCode] = useState("");

  const refresh = () => router.refresh();

  const startEnrollment = async () => {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/auth/mfa/enroll/start", { method: "POST" });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Unable to start enrollment."));
      setEnrollment((await response.json()) as { secret: string; qrDataUrl: string });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to start enrollment." });
    } finally { setBusy(false); }
  };

  const confirmEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/auth/mfa/enroll/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim() }) });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Unable to confirm the code."));
      const result = (await response.json()) as { recoveryCodes: string[] };
      setRecoveryCodes(result.recoveryCodes);
      setEnrollment(null);
      setCode("");
      setState({ ...state, enrolled: true, enrolledAt: new Date().toISOString(), recoveryCodesRemaining: result.recoveryCodes.length });
      setNotice({ tone: "success", message: "Two-factor authentication is on. Every sign-in now needs a code." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to confirm the code." });
    } finally { setBusy(false); }
  };

  const withCode = async (path: string, onOk: (result: Record<string, unknown>) => void, label: string) => {
    if (!actionCode.trim()) { setNotice({ tone: "error", message: "Enter a current authenticator code first." }); return; }
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: actionCode.trim() }) });
      if (!response.ok) throw new Error(await getErrorMessage(response, `Unable to ${label}.`));
      onOk((await response.json()) as Record<string, unknown>);
      setActionCode("");
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : `Unable to ${label}.` });
    } finally { setBusy(false); }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm("Sign out of every device and browser? You will need to sign in again here too.")) return;
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Security</span>
        <h2 className="mt-4 text-3xl tracking-tight">Two-factor authentication</h2>
        <p className="mt-3 max-w-3xl text-admin-muted">
          Signing in as {email} requires your password and a code from an authenticator app. Sessions last 12 hours;
          cookies are host-locked and never readable by scripts.
        </p>
      </section>

      {mustEnroll && !state.enrolled ? (
        <div className="border border-admin-warning-border bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
          The dashboard and its APIs stay locked until an authenticator is set up. Finish enrollment below.
        </div>
      ) : null}

      {notice ? (
        <div className={`border px-4 py-3 text-sm ${notice.tone === "success" ? "border-admin-success-border bg-admin-success-bg text-admin-success-fg" : "border-admin-danger-border bg-admin-danger-bg text-admin-danger-fg"}`}>
          {notice.message}
        </div>
      ) : null}

      {recoveryCodes ? <RecoveryCodes codes={recoveryCodes} onDone={() => { setRecoveryCodes(null); refresh(); }} /> : null}

      {!state.enrolled ? (
        <section className={`${adminPanelClasses} p-6`}>
          <h3 className="text-xl">Set up an authenticator</h3>
          {!enrollment ? (
            <>
              <p className="mt-2 text-sm text-admin-muted">Works with Google Authenticator, 1Password, Apple Passwords, Authy, and any TOTP app.</p>
              <button type="button" className={`${adminPrimaryButtonClasses} mt-5`} onClick={startEnrollment} disabled={busy}>
                {busy ? "Preparing..." : "Start setup"}
              </button>
            </>
          ) : (
            <form onSubmit={confirmEnrollment} className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated server-side */}
              <img src={enrollment.qrDataUrl} alt="Authenticator QR code" className="h-[220px] w-[220px] border border-admin-border bg-white" />
              <div className="space-y-4">
                <p className="text-sm text-admin-muted">
                  Scan the QR code, or enter this key manually:{" "}
                  <code className="break-all text-admin-fg">{enrollment.secret}</code>
                </p>
                <div>
                  <label htmlFor="enroll-code" className={adminLabelClasses}>Code from the app</label>
                  <input id="enroll-code" className={`${adminInputClasses} max-w-xs font-mono tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required disabled={busy} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className={adminPrimaryButtonClasses} disabled={busy}>{busy ? "Verifying..." : "Turn on"}</button>
                  <button type="button" className={adminSecondaryButtonClasses} onClick={() => setEnrollment(null)} disabled={busy}>Cancel</button>
                </div>
              </div>
            </form>
          )}
        </section>
      ) : (
        <section className={`${adminPanelClasses} p-6`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="border border-admin-success-border bg-admin-success-bg px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-admin-success-fg">enabled</span>
            <span className="text-sm text-admin-muted">since {formatRelative(state.enrolledAt)} · {state.recoveryCodesRemaining} recovery codes left</span>
          </div>
          {state.recoveryCodesRemaining <= 2 ? (
            <p className="mt-3 text-sm text-admin-warning-fg">You are nearly out of recovery codes; generate a new set.</p>
          ) : null}

          <div className="mt-6">
            <label htmlFor="action-code" className={adminLabelClasses}>Current authenticator code (required for the actions below)</label>
            <input id="action-code" className={`${adminInputClasses} max-w-xs font-mono tracking-[0.3em]`} value={actionCode} onChange={(e) => setActionCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" disabled={busy} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={adminSecondaryButtonClasses} disabled={busy} onClick={() => withCode("/api/auth/mfa/recovery", (r) => { setRecoveryCodes(r.recoveryCodes as string[]); setState({ ...state, recoveryCodesRemaining: 10 }); }, "regenerate recovery codes")}>
              New recovery codes
            </button>
            <button type="button" className={adminDangerButtonClasses} disabled={busy} onClick={() => { if (window.confirm("Turn off two-factor authentication? Password alone will open the dashboard until you enroll again.")) withCode("/api/auth/mfa/disable", () => { setState({ enrolled: false, recoveryCodesRemaining: 0 }); setNotice({ tone: "success", message: "Two-factor authentication is off. Set it up again as soon as you can." }); refresh(); }, "disable two-factor authentication"); }}>
              Turn off
            </button>
          </div>
        </section>
      )}

      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">Sessions</h3>
        <p className="mt-2 text-sm text-admin-muted">
          Sign out of every device and browser at once. Existing sessions are revoked immediately; each one has to sign in again with password and code.
        </p>
        <button type="button" className={`${adminDangerButtonClasses} mt-4`} onClick={signOutEverywhere}>Sign out everywhere</button>
      </section>
    </div>
  );
}
