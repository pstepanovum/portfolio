"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resumePlaidOAuth } from "@/components/admin/plaid-link";
import { adminPanelClasses, adminSecondaryButtonClasses } from "@/components/admin/styles";

/**
 * Where a bank returns the browser after OAuth sign-in.
 *
 * Plaid requires this URL to be registered verbatim in the dashboard and to
 * re-open Link with the original token so the session can finish. It lives
 * inside /dashboard so only a signed-in admin can reach it; the session cookie
 * is SameSite=Lax, which survives the bank's top-level redirect back here.
 */
export default function PlaidOAuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Effects run twice under React strict mode in development, and opening
    // Link twice would invalidate the first handler.
    if (started.current) return;
    started.current = true;

    const back = (query: string) => {
      router.replace(`/dashboard/connections/plaid${query}`);
      router.refresh();
    };

    resumePlaidOAuth({
      onLinked: () => back("?linked=1"),
      onCancel: () => back(""),
      onError: (message) => setError(message),
    });
  }, [router]);

  return (
    <div className="mx-auto max-w-lg py-16">
      <div className={`${adminPanelClasses} p-8 text-center`}>
        {error ? (
          <>
            <h1 className="text-xl">Sign-in could not be completed</h1>
            <p className="mt-3 text-sm text-admin-danger-fg">{error}</p>
            <button
              type="button"
              className={`${adminSecondaryButtonClasses} mt-6`}
              onClick={() => router.replace("/dashboard/connections/plaid")}
            >
              Back to banks
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl">Finishing sign-in</h1>
            <p className="mt-3 text-sm text-admin-muted">
              Returning from your bank. This window will continue on its own.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
