import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthorizeForm, type ResourceChoice } from "@/components/admin/authorize-form";
import {
  adminBadgeClasses,
  adminPanelClasses,
  adminShellClasses,
} from "@/components/admin/styles";
import { AdminThemeScript } from "@/components/admin/theme-script";
import { getAdminSession } from "@/lib/firebase/auth";
import {
  buildAuthorizeUrl,
  buildRedirectWithError,
  flattenSearchParams,
  getResourceName,
  validateAuthorizeParams,
} from "@/lib/oauth/authorize";
import { describeRedirectTarget, sanitizeClientName } from "@/lib/oauth/client-identity";
import { MCP_RESOURCES, getBaseUrl, normalizeScopes, type McpResourceKey } from "@/lib/oauth/config";

export const metadata: Metadata = {
  title: "Authorize MCP Access",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";


const HIDDEN_FIELDS = [
  "client_id",
  "redirect_uri",
  "response_type",
  "state",
  "code_challenge",
  "code_challenge_method",
] as const;

/** One line per server, so the picker explains what each one reaches. */
const RESOURCE_BLURBS: Record<McpResourceKey, string> = {
  portfolio: "Projects, certifications, and timeline on the public site.",
  apps: "Gmail, Google Workspace, linked banks, and custom MCP servers.",
};

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
      <AdminThemeScript />
      <div className={`${adminPanelClasses} mx-auto w-full max-w-xl p-8`}>
        <span className={adminBadgeClasses}>Authorization Error</span>
        <h1 className="mt-5 text-3xl tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-admin-muted">{description}</p>
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
  const headerList = await headers();
  const validation = await validateAuthorizeParams(raw, { headers: headerList });

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

  // An enrolled account already needs the second-factor cookie to get a
  // session at all. An un-enrolled one does not, so without this a password
  // alone could approve a connection.
  if (!session.mfaEnrolled) {
    redirect("/dashboard/security?enroll=1");
  }

  const { client, params } = validation;
  const baseUrl = getBaseUrl({ headers: headerList });
  const target = describeRedirectTarget(params.redirectUri);

  // Scopes depend on which server is chosen, so both sets are resolved here
  // and the form swaps between them without another round trip.
  const choices: ResourceChoice[] = Object.values(MCP_RESOURCES).map((resource) => ({
    key: resource.key,
    name: resource.name,
    url: `${baseUrl}${resource.path}`,
    scopes: normalizeScopes(raw.scope, resource.key),
    available: resource.scopes,
    blurb: RESOURCE_BLURBS[resource.key],
  }));

  return (
    <main
      className={`${adminShellClasses} flex min-h-screen items-center px-6 py-16`}
    >
      <AdminThemeScript />
      <div className={`${adminPanelClasses} mx-auto w-full max-w-xl p-8`}>
        <span className={adminBadgeClasses}>Connection Request</span>

        <h1 className="mt-5 text-3xl tracking-tight">
          Connect {sanitizeClientName(client.clientName)}?
        </h1>

        {/*
          The client name is chosen by whoever registered the client, so it is
          the least trustworthy thing on this page. Where the code goes is not
          something they can fake, and it is what decides who ends up holding
          the token, so it sits right under the headline.
        */}
        <div className="mt-4 border border-admin-border bg-admin-inset px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Access goes to</div>
          <div className="mt-1 break-all font-mono text-base text-admin-fg">{target.destination}</div>
          <div className="mt-1 text-xs text-admin-muted">
            {target.loopback
              ? "An app running on this computer."
              : "Approve only if you recognise this address as belonging to the app named above."}
          </div>
        </div>
        <p className="mt-3 text-sm text-admin-muted">
          {params.resourceExplicit ? (
            <>
              This application is asking to connect to{" "}
              <span className="text-admin-fg">{getResourceName(params.resourceKey)}</span> as{" "}
              {session.email ?? "admin"}.
            </>
          ) : (
            <>This application is asking to connect as {session.email ?? "admin"}.</>
          )}
        </p>

        <dl className="mt-8 space-y-3 border-t border-admin-border pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-admin-subtle">Redirects to</dt>
            <dd className="break-all text-right text-admin-strong">
              {params.redirectUri}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-admin-subtle">Client ID</dt>
            <dd className="break-all text-right font-mono text-xs text-admin-strong">
              {params.clientId}
            </dd>
          </div>
        </dl>

        <AuthorizeForm
          hidden={Object.fromEntries(HIDDEN_FIELDS.map((field) => [field, raw[field] ?? ""]))}
          choices={choices}
          initialKey={params.resourceKey}
          resourceResolved={params.resourceResolved}
        />
      </div>
    </main>
  );
}
