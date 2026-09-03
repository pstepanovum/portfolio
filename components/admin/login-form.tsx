"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseClientAuth } from "@/lib/firebase/client";
import {
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";

type SessionResponse = { success?: boolean; mfaRequired?: boolean; mfaEnrolled?: boolean; error?: string; locked?: boolean };

export function LoginForm({ nextPath }: { nextPath?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [idToken, setIdToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openSession = async (token: string, mfaCode?: string) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token, mfaCode }),
    });
    const result = (await response.json().catch(() => ({}))) as SessionResponse;

    if (response.ok && result.success) {
      // Without an authenticator the dashboard stays closed until one is set up.
      router.replace(result.mfaEnrolled ? nextPath || "/dashboard" : "/dashboard/security?enroll=1");
      router.refresh();
      return;
    }

    if (result.mfaRequired) {
      setIdToken(token);
      if (result.error) setError(result.error);
      return;
    }

    throw new Error(result.error || "Unable to open your admin session.");
  };

  const handlePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(firebaseClientAuth, email, password);
      await openSession(await credential.user.getIdToken(true));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed. Check your admin account and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!idToken) return;
    setError("");
    setIsSubmitting(true);

    try {
      await openSession(idToken, code.trim());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The code could not be verified.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (idToken) {
    return (
      <form onSubmit={handleCode} className={`${adminPanelClasses} w-full max-w-md space-y-6 p-8`}>
        <div className="space-y-3">
          <div className="text-sm uppercase tracking-[0.25em] text-admin-muted">Second step</div>
          <h1 className="text-3xl tracking-tight">Enter your code</h1>
          <p className="text-sm text-admin-muted">
            Open your authenticator app and enter the 6-digit code for pstepanov.dev, or use one of your recovery codes.
          </p>
        </div>

        <div>
          <label htmlFor="mfa-code" className={adminLabelClasses}>Authenticator or recovery code</label>
          <input
            id="mfa-code"
            className={`${adminInputClasses} font-mono tracking-[0.3em]`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="text"
            autoFocus
            required
            disabled={isSubmitting}
          />
        </div>

        {error ? <div className="border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">{error}</div> : null}

        <div className="flex gap-3">
          <button type="submit" className={`${adminPrimaryButtonClasses} flex-1`} disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Continue"}
          </button>
          <button type="button" className={adminSecondaryButtonClasses} onClick={() => { setIdToken(null); setCode(""); setError(""); }} disabled={isSubmitting}>
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handlePassword} className={`${adminPanelClasses} w-full max-w-md space-y-6 p-8`}>
      <div className="space-y-3">
        <div className="text-sm uppercase tracking-[0.25em] text-admin-muted">Secure Access</div>
        <h1 className="text-3xl tracking-tight">Welcome back</h1>
        <p className="text-sm text-admin-muted">
          Sign in to update the portfolio, review contacts, manage your resume, and keep everything current.
        </p>
      </div>

      <div>
        <label htmlFor="email" className={adminLabelClasses}>Email</label>
        <input id="email" type="email" autoComplete="email" className={adminInputClasses} value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} />
      </div>

      <div>
        <label htmlFor="password" className={adminLabelClasses}>Password</label>
        <input id="password" type="password" autoComplete="current-password" className={adminInputClasses} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} />
      </div>

      {error ? <div className="border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">{error}</div> : null}

      <button type="submit" className={`${adminPrimaryButtonClasses} w-full`} disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Open Dashboard"}
      </button>
    </form>
  );
}
