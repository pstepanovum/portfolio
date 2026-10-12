"use client";

import { useEffect, useState } from "react";
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
import { browserSupportsWebAuthn, getSecondFactorProof, registerPasskey } from "@/components/admin/passkey-client";
import { formatRelative } from "@/components/admin/time";
import type { MfaState } from "@/lib/auth/mfa";

type Notice = { tone: "success" | "error"; message: string } | null;
type Proof = Awaited<ReturnType<typeof getSecondFactorProof>>;

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  return result?.error || fallback;
}

async function postWithProof(path: string, proof: Proof | null, fallback: string, method = "POST") {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proof ?? {}),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, fallback));
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  return (
    <section className={`${adminPanelClasses} border-admin-warning-border p-6`}>
      <span className={adminBadgeClasses}>Recovery codes</span>
      <h3 className="mt-4 text-xl">Save these now — they are shown once</h3>
      <p className="mt-2 text-sm text-admin-muted">
        Each code signs you in once if you lose your passkeys or authenticator. Keep them somewhere safe and offline.
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

const enabledBadge = "border border-admin-success-border bg-admin-success-bg px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-admin-success-fg";

export function SecurityManager({ initialState, mustEnroll, email }: { initialState: MfaState; mustEnroll: boolean; email: string }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [actionCode, setActionCode] = useState("");
  const [passkeyName, setPasskeyName] = useState("");
  const [webAuthnSupported, setWebAuthnSupported] = useState(true);

  useEffect(() => setWebAuthnSupported(browserSupportsWebAuthn()), []);
  useEffect(() => setState(initialState), [initialState]);

  const hasPasskeys = state.passkeys.length > 0;
  const factorCount = state.passkeys.length + (state.totpEnrolled ? 1 : 0);
  const refresh = () => router.refresh();

  /** Runs a sensitive action with a fresh second factor: the typed code, otherwise a passkey prompt. */
  const withProof = async (label: string, action: (proof: Proof) => Promise<void>) => {
    setBusy(true); setNotice(null);
    try {
      const proof = await getSecondFactorProof(actionCode, hasPasskeys && webAuthnSupported);
      await action(proof);
      setActionCode("");
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : `Unable to ${label}.` });
    } finally { setBusy(false); }
  };

  const startEnrollment = async () => {
    const run = async (proof: Proof | null) => {
      const result = await postWithProof("/api/auth/mfa/enroll/start", proof, "Unable to start enrollment.");
      setEnrollment(result as { secret: string; qrDataUrl: string });
    };

    if (state.enrolled) {
      await withProof("start enrollment", run);
      return;
    }

    setBusy(true); setNotice(null);
    try { await run(null); } catch (error) {
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
      setState({ ...state, enrolled: true, totpEnrolled: true, enrolledAt: new Date().toISOString(), recoveryCodesRemaining: result.recoveryCodes.length });
      setNotice({ tone: "success", message: "The authenticator app is on. Add a passkey next: it is quicker and cannot be phished." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to confirm the code." });
    } finally { setBusy(false); }
  };

  const addPasskey = (event: React.FormEvent) => {
    event.preventDefault();
    return withProof("add a passkey", async (proof) => {
      const { passkey } = await registerPasskey(proof, passkeyName);
      setPasskeyName("");
      setState((current) => ({
        ...current,
        passkeys: [...current.passkeys, { id: passkey.id, name: passkey.name, createdAt: new Date().toISOString(), backedUp: false }],
      }));
      setNotice({ tone: "success", message: `Passkey "${passkey.name}" added. Sign-in will offer it first.` });
      refresh();
    });
  };

  const removePasskey = (id: string, name: string) => {
    if (!window.confirm(`Remove the passkey "${name}"? It will no longer sign in here.`)) return;
    return withProof("remove the passkey", async (proof) => {
      await postWithProof(`/api/auth/passkeys/${encodeURIComponent(id)}`, proof, "Unable to remove the passkey.", "DELETE");
      setState((current) => ({ ...current, passkeys: current.passkeys.filter((passkey) => passkey.id !== id) }));
      setNotice({ tone: "success", message: `Passkey "${name}" removed.` });
      refresh();
    });
  };

  const regenerateRecoveryCodes = () => withProof("regenerate recovery codes", async (proof) => {
    const result = await postWithProof("/api/auth/mfa/recovery", proof, "Unable to regenerate recovery codes.");
    setRecoveryCodes(result.recoveryCodes as string[]);
    setState((current) => ({ ...current, recoveryCodesRemaining: (result.recoveryCodes as string[]).length }));
  });

  const disableTotp = () => {
    if (!window.confirm("Turn off the authenticator app? Your passkeys and recovery codes keep working.")) return;
    return withProof("turn off the authenticator app", async (proof) => {
      await postWithProof("/api/auth/mfa/disable", proof, "Unable to turn off the authenticator app.");
      setState((current) => ({ ...current, totpEnrolled: false, enrolledAt: undefined }));
      setNotice({ tone: "success", message: "The authenticator app is off. Sign-in now uses your passkeys or a recovery code." });
      refresh();
    });
  };

  const signOutEverywhere = async () => {
    if (!window.confirm("Sign out of every device and browser? You will need to sign in again here too.")) return;
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  const enrollmentForm = enrollment ? (
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
  ) : null;

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Security</span>
        <h2 className="mt-4 text-3xl tracking-tight">Two-factor authentication</h2>
        <p className="mt-3 max-w-3xl text-admin-muted">
          Signing in as {email} requires your password and a second factor: a passkey (preferred, since it only ever answers this
          site) or a code from an authenticator app. Sessions last 12 hours; cookies are host-locked and never readable by scripts.
        </p>
      </section>

      {mustEnroll && !state.enrolled ? (
        <div className="border border-admin-warning-border bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
          The dashboard and its APIs stay locked until an authenticator is set up. Finish enrollment below, then add a passkey.
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
              <p className="mt-2 text-sm text-admin-muted">
                Works with Google Authenticator, 1Password, Apple Passwords, Authy, and any TOTP app. Once it is on, you can add passkeys.
              </p>
              <button type="button" className={`${adminPrimaryButtonClasses} mt-5`} onClick={startEnrollment} disabled={busy}>
                {busy ? "Preparing..." : "Start setup"}
              </button>
            </>
          ) : enrollmentForm}
        </section>
      ) : (
        <>
          <section className={`${adminPanelClasses} p-6`}>
            <h3 className="text-xl">Confirming changes</h3>
            <p className="mt-2 max-w-3xl text-sm text-admin-muted">
              Every change below asks for a second factor at that moment.{" "}
              {hasPasskeys ? "Your passkey is used by default; type a current authenticator or recovery code here to use that instead." : "Type a current authenticator or recovery code here first."}
            </p>
            <div className="mt-4">
              <label htmlFor="action-code" className={adminLabelClasses}>Authenticator or recovery code{hasPasskeys ? " (optional)" : ""}</label>
              <input id="action-code" className={`${adminInputClasses} max-w-xs font-mono tracking-[0.3em]`} value={actionCode} onChange={(e) => setActionCode(e.target.value)} autoComplete="one-time-code" disabled={busy} />
            </div>
          </section>

          <section className={`${adminPanelClasses} p-6`}>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl">Passkeys</h3>
              {hasPasskeys ? <span className={enabledBadge}>preferred</span> : null}
            </div>
            <p className="mt-2 max-w-3xl text-sm text-admin-muted">
              A passkey on this device, your phone, or a security key. It is bound to pstepanov.dev, so a look-alike site cannot use it.
            </p>
            {!webAuthnSupported ? (
              <p className="mt-3 text-sm text-admin-warning-fg">This browser does not support passkeys.</p>
            ) : null}

            {hasPasskeys ? (
              <ul className="mt-5 divide-y divide-admin-border border border-admin-border">
                {state.passkeys.map((passkey) => (
                  <li key={passkey.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-admin-fg">{passkey.name}</div>
                      <div className="text-xs text-admin-muted">
                        added {formatRelative(passkey.createdAt)} · last used {formatRelative(passkey.lastUsedAt)}
                        {passkey.backedUp ? " · synced" : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={adminDangerButtonClasses}
                      disabled={busy || factorCount <= 1}
                      title={factorCount <= 1 ? "At least one second factor must remain." : undefined}
                      onClick={() => removePasskey(passkey.id, passkey.name)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <form onSubmit={addPasskey} className="mt-5 flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label htmlFor="passkey-name" className={adminLabelClasses}>Name</label>
                <input id="passkey-name" className={adminInputClasses} value={passkeyName} onChange={(e) => setPasskeyName(e.target.value)} placeholder="MacBook Touch ID" maxLength={60} required disabled={busy || !webAuthnSupported} />
              </div>
              <button type="submit" className={adminPrimaryButtonClasses} disabled={busy || !webAuthnSupported}>
                {busy ? "Waiting..." : "Add passkey"}
              </button>
            </form>
          </section>

          <section className={`${adminPanelClasses} p-6`}>
            <h3 className="text-xl">Authenticator app</h3>
            {state.totpEnrolled ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className={enabledBadge}>enabled</span>
                  <span className="text-sm text-admin-muted">since {formatRelative(state.enrolledAt)}</span>
                </div>
                <button
                  type="button"
                  className={`${adminDangerButtonClasses} mt-4`}
                  disabled={busy || !hasPasskeys}
                  title={!hasPasskeys ? "Add a passkey first: at least one second factor must remain." : undefined}
                  onClick={disableTotp}
                >
                  Turn off
                </button>
                {!hasPasskeys ? (
                  <p className="mt-2 text-xs text-admin-muted">To replace the app, add a passkey, turn the app off, then set it up again.</p>
                ) : null}
              </>
            ) : !enrollment ? (
              <>
                <p className="mt-2 text-sm text-admin-muted">Optional while you have a passkey; a fallback for devices without one.</p>
                <button type="button" className={`${adminSecondaryButtonClasses} mt-4`} onClick={startEnrollment} disabled={busy}>Set up</button>
              </>
            ) : enrollmentForm}
          </section>

          <section className={`${adminPanelClasses} p-6`}>
            <h3 className="text-xl">Recovery codes</h3>
            <p className="mt-2 text-sm text-admin-muted">{state.recoveryCodesRemaining} left. Each one stands in for a passkey or code once.</p>
            {state.recoveryCodesRemaining <= 2 ? (
              <p className="mt-2 text-sm text-admin-warning-fg">You are nearly out of recovery codes; generate a new set.</p>
            ) : null}
            <button type="button" className={`${adminSecondaryButtonClasses} mt-4`} disabled={busy} onClick={regenerateRecoveryCodes}>
              New recovery codes
            </button>
          </section>
        </>
      )}

      <section className={`${adminPanelClasses} p-6`}>
        <h3 className="text-xl">Sessions</h3>
        <p className="mt-2 text-sm text-admin-muted">
          Sign out of every device and browser at once. Existing sessions are revoked immediately; each one has to sign in again with password and a second factor.
        </p>
        <button type="button" className={`${adminDangerButtonClasses} mt-4`} onClick={signOutEverywhere}>Sign out everywhere</button>
      </section>
    </div>
  );
}
