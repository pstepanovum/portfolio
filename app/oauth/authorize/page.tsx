import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  adminBadgeClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
  adminShellClasses,
} from "@/components/admin/styles";
import { getAdminSession } from "@/lib/firebase/auth";
import {
  buildAuthorizeUrl,
  buildRedirectWithError,
  flattenSearchParams,
  validateAuthorizeParams,
} from "@/lib/oauth/authorize";
import { OAUTH_SCOPE_WRITE } from "@/lib/oauth/config";

export const metadata: Metadata = {
  title: "Authorize MCP Access",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "portfolio:read":
    "Read your projects, certifications, timeline, skills, values, and resume status.",
  "portfolio:write":
    "Create, update, and delete projects, certifications, and timeline entries.",
};

const HIDDEN_FIELDS = [
  "client_id",
  "redirect_uri",
  "response_type",
  "state",
  "code_challenge",
  "code_challenge_method",
  "resource",
] as const;

function ErrorPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main
      className={`${adminShellClasses} flex min-h-screen items-center px-6 py-16`}
    >
      <div className={`${adminPanelClasses} mx-auto w-full max-w-xl p-8`}>
        <span className={adminBadgeClasses}>Authorization Error</span>
        <h1 className="mt-5 text-3xl tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-white/60">{description}</p>
      </div>
    </main>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = flattenSearchParams(await searchParams);
  const validation = await validateAuthorizeParams(raw);

  if (!validation.ok) {
    // Errors the client can be told about go back over redirect_uri, but only
    // after redirect_uri itself was verified against the registration.
    if (validation.redirectable && raw.redirect_uri) {
      redirect(
        buildRedirectWithError(
          raw.redirect_uri,
          validation.error,
          validation.description,
          raw.state,
        ),
      );
    }

    return (
      <ErrorPanel
        title="This request could not be authorized"
        description={validation.description}
      />
    );
  }

  const session = await getAdminSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(buildAuthorizeUrl(raw))}`);
  }

  const { client, params } = validation;

  return (
    <main
      className={`${adminShellClasses} flex min-h-screen items-center px-6 py-16`}
    >
      <div className={`${adminPanelClasses} mx-auto w-full max-w-xl p-8`}>
        <span className={adminBadgeClasses}>Connection Request</span>

        <h1 className="mt-5 text-3xl tracking-tight">
          Connect {client.clientName}?
        </h1>
        <p className="mt-3 text-sm text-white/60">
          This application is asking to connect to your portfolio through the
          MCP server as {session.email ?? "admin"}.
        </p>

        <div className="mt-8 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">
            It will be able to
          </div>
          <ul className="space-y-3">
            {params.scopes.map((scope) => (
              <li
                key={scope}
                className="border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75"
              >
                <div className="font-mono text-xs text-white/50">{scope}</div>
                <div className="mt-1">
                  {SCOPE_DESCRIPTIONS[scope] ?? "Unrecognised permission."}
                </div>
              </li>
            ))}
          </ul>

          {params.scopes.includes(OAUTH_SCOPE_WRITE) ? (
            <p className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Write access lets this client change what appears on your public
              site. Only approve clients you trust.
            </p>
          ) : null}
        </div>

        <dl className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-white/45">Redirects to</dt>
            <dd className="break-all text-right text-white/70">
              {params.redirectUri}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/45">Client ID</dt>
            <dd className="break-all text-right font-mono text-xs text-white/70">
              {params.clientId}
            </dd>
          </div>
        </dl>

        <form action="/api/oauth/authorize" method="POST" className="mt-8">
          {HIDDEN_FIELDS.map((field) => (
            <input
              key={field}
              type="hidden"
              name={field}
              value={raw[field] ?? ""}
            />
          ))}
          <input type="hidden" name="scope" value={params.scopes.join(" ")} />

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              name="decision"
              value="allow"
              className={`${adminPrimaryButtonClasses} flex-1`}
            >
              Approve access
            </button>
            <button
              type="submit"
              name="decision"
              value="deny"
              className={`${adminSecondaryButtonClasses} flex-1`}
            >
              Deny
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
