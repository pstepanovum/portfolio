"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import type { CustomMcpServer } from "@/lib/connections/custom-mcp";

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  return result?.error || fallback;
}

/** Registers a remote MCP server; discovery runs server-side on submit. */
export function CustomMcpForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<"none" | "bearer" | "oauth">("none");
  const [bearerToken, setBearerToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/admin/custom-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, authType, bearerToken: authType === "bearer" ? bearerToken : undefined }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Unable to add the MCP server."));
      }

      const { server, authorizeUrl } = (await response.json()) as {
        server: CustomMcpServer;
        authorizeUrl?: string;
      };

      // OAuth: the remote's consent screen finishes the job and returns via
      // our callback, which lands on the server page.
      if (authorizeUrl) {
        window.location.assign(authorizeUrl);
        return;
      }

      router.push(`/dashboard/connections/custom/${server.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add the MCP server.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${adminPanelClasses} space-y-5 p-6`}>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl">Add Custom MCP</h3>
          <span className="border border-admin-border px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-admin-muted">
            Beta · MCP only
          </span>
        </div>
        <p className="mt-2 text-sm text-admin-muted">
          Create a toolkit from a remote MCP server. Its tools are discovered and exposed
          through the admin server as <code className="text-admin-fg">name__tool</code>. For
          OAuth servers you will sign in at the remote once; tokens are stored encrypted and
          refreshed automatically.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="mcp-name" className={adminLabelClasses}>Name</label>
          <input id="mcp-name" className={adminInputClasses} placeholder="Acme MCP" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} disabled={busy} />
        </div>
        <div>
          <label htmlFor="mcp-url" className={adminLabelClasses}>Server URL</label>
          <input id="mcp-url" className={adminInputClasses} placeholder="https://mcp.example.com/mcp" value={url} onChange={(e) => setUrl(e.target.value)} required disabled={busy} />
        </div>
      </div>

      <div>
        <span className={adminLabelClasses}>Authentication</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ["none", "None", "Public server"],
            ["bearer", "Bearer token", "Static API token"],
            ["oauth", "OAuth", "Sign in at the remote"],
          ] as const).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              onClick={() => setAuthType(value)}
              className={`border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                authType === value ? "border-admin-accent bg-admin-hover-strong" : "border-admin-border bg-admin-inset hover:bg-admin-hover"
              }`}
            >
              <div className="text-sm text-admin-fg">{label}</div>
              <div className="text-xs text-admin-subtle">{hint}</div>
            </button>
          ))}
        </div>
      </div>

      {authType === "bearer" ? (
        <div>
          <label htmlFor="mcp-token" className={adminLabelClasses}>Bearer token</label>
          <input id="mcp-token" type="password" className={adminInputClasses} value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} autoComplete="off" disabled={busy} />
          <p className="mt-2 text-xs text-admin-subtle">Stored encrypted; sent only to this server.</p>
        </div>
      ) : null}

      {error ? (
        <div className="border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">{error}</div>
      ) : null}

      <div className="flex gap-3">
        <button type="submit" className={adminPrimaryButtonClasses} disabled={busy}>
          {busy ? (authType === "oauth" ? "Preparing sign-in..." : "Discovering tools...") : authType === "oauth" ? "Continue to sign in" : "Add server"}
        </button>
        <button type="button" className={adminSecondaryButtonClasses} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
