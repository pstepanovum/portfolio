import { headers } from "next/headers";
import { GmailApp, type Notice } from "@/components/admin/gmail-app";
import { isEncryptionConfigured } from "@/lib/connections/crypto";
import { GOOGLE_CALLBACK_PATH, isGoogleOAuthConfigured } from "@/lib/connections/google";
import { listConnections } from "@/lib/connections/store";
import { getGmailToolCatalog } from "@/lib/mcp/tool-catalog";
import { MCP_RESOURCES, getBaseUrl } from "@/lib/oauth/config";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** The Google callback lands here with either ?connected= or ?error=. */
function noticeFromQuery(params: Record<string, string | string[] | undefined>): Notice {
  const connected = first(params.connected);
  const error = first(params.error);
  if (connected) return { tone: "success", message: `Connected ${connected}.` };
  if (error) return { tone: "error", message: error };
  return null;
}

export default async function GmailAppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [connections, params, headerList] = await Promise.all([listConnections(), searchParams, headers()]);
  const baseUrl = getBaseUrl({ headers: headerList });

  return (
    <GmailApp
      initialConnections={connections}
      initialNotice={noticeFromQuery(params)}
      openConnect={first(params.connect) === "1"}
      googleConfigured={isGoogleOAuthConfigured()}
      encryptionConfigured={isEncryptionConfigured()}
      callbackUrl={`${baseUrl}${GOOGLE_CALLBACK_PATH}`}
      adminMcpUrl={`${baseUrl}${MCP_RESOURCES.admin.path}`}
      tools={getGmailToolCatalog().map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        badge: tool.scope,
        destructive: tool.destructive,
      }))}
    />
  );
}
