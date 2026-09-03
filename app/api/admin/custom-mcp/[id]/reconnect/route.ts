import { NextResponse, type NextRequest } from "next/server";
import { startOAuth } from "@/lib/connections/custom-mcp";
import { CUSTOM_MCP_OAUTH_CALLBACK_PATH } from "@/lib/connections/mcp-oauth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";
import { getBaseUrl } from "@/lib/oauth/config";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Restarts the OAuth flow for a registered server; returns the URL to visit. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    const url = await startOAuth(id, `${getBaseUrl(request)}${CUSTOM_MCP_OAUTH_CALLBACK_PATH}`);
    return NextResponse.json({ url });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to start authorization.", 400);
  }
}
