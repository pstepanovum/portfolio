import { headers } from "next/headers";
import SettingsManager from "@/components/admin/settings-manager";
import { getDashboardSettings } from "@/lib/firebase/portfolio";
import { MCP_ENDPOINT_PATH } from "@/lib/oauth/config";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Derived from the request so the dashboard shows a URL that works in the
 * environment you are actually looking at. Display only, never used to mint
 * tokens, so trusting the Host header here is harmless.
 */
async function getMcpUrl() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") || headerList.get("host") || "";

  if (!host) {
    return absoluteUrl(MCP_ENDPOINT_PATH);
  }

  const protocol =
    headerList.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}${MCP_ENDPOINT_PATH}`;
}

export default async function DashboardSettingsPage() {
  const [settings, mcpUrl] = await Promise.all([
    getDashboardSettings(),
    getMcpUrl(),
  ]);

  return (
    <SettingsManager
      initialSettings={settings}
      geminiConfigured={Boolean(settings.geminiApiKey)}
      storageBucket={
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        "pstepanovdev.firebasestorage.app"
      }
      mcpUrl={mcpUrl}
    />
  );
}
