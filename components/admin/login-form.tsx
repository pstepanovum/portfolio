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
} from "@/components/admin/styles";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(
        firebaseClientAuth,
        email,
        password,
      );

      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(result?.error || "Unable to open your admin session.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Login failed. Check your admin account and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${adminPanelClasses} w-full max-w-md space-y-6 p-8`}
    >
      <div className="space-y-3">
        <div className="text-sm uppercase tracking-[0.25em] text-white/55">
          Secure Access
        </div>
        <h1 className="text-3xl tracking-tight">Welcome back</h1>
        <p className="text-sm text-white/60">
          Sign in to update the portfolio, review contacts, manage your resume,
          and keep everything current.
        </p>
      </div>

      <div>
        <label htmlFor="email" className={adminLabelClasses}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={adminInputClasses}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="password" className={adminLabelClasses}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={adminInputClasses}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      {error ? (
        <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className={`${adminPrimaryButtonClasses} w-full`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Open Dashboard"}
      </button>
    </form>
  );
}
