import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GoogleAppView, type Notice } from "@/components/admin/google-app";
import { isEncryptionConfigured } from "@/lib/connections/crypto";
import { GOOGLE_CALLBACK_PATH, isGoogleOAuthConfigured } from "@/lib/connections/google";
import { getGoogleApp, type GoogleAppKey } from "@/lib/connections/google-apps";
import { listConnections } from "@/lib/connections/store";
import { getAppToolCatalog } from "@/lib/mcp/tool-catalog";
import { getBaseUrl } from "@/lib/oauth/config";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** The Google callback lands on the Gmail page with either ?connected= or ?error=. */
function noticeFromQuery(params: Record<string, string | string[] | undefined>): Notice {
  const connected = first(params.connected);
  const error = first(params.error);
  if (connected) return { tone: "success", message: `Connected ${connected}.` };
  if (error) return { tone: "error", message: error };
  return null;
}

export default async function GoogleAppPage({
  params,
  searchParams,
}: {
  params: Promise<{ app: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

  const [{ app: key }, query, headerList, connections] = await Promise.all([params, searchParams, headers(), listConnections()]);
  const app = getGoogleApp(key);

  if (!app) {
    notFound();
  }

  const baseUrl = getBaseUrl({ headers: headerList });

  return (
    <GoogleAppView
      app={app}
      initialConnections={connections}
      initialNotice={noticeFromQuery(query)}
      openConnect={first(query.connect) === "1"}
      googleConfigured={isGoogleOAuthConfigured()}
      encryptionConfigured={isEncryptionConfigured()}
      callbackUrl={`${baseUrl}${GOOGLE_CALLBACK_PATH}`}
      tools={getAppToolCatalog(app.key as GoogleAppKey).map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        badge: tool.scope,
        destructive: tool.destructive,
      }))}
    />
  );
}
