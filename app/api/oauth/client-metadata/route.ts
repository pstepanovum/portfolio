import { NextResponse } from "next/server";
import { CUSTOM_MCP_CLIENT_METADATA_PATH, buildClientMetadata } from "@/lib/connections/mcp-oauth";
import { getBaseUrl } from "@/lib/oauth/config";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Client ID Metadata Document (SEP-991). Remote authorization servers that
 * do not offer dynamic registration fetch this URL, which doubles as our
 * client id, to learn our name and redirect URI. Public by design; it holds
 * no secret.
 */
export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const response = NextResponse.json(
    { client_id: `${baseUrl}${CUSTOM_MCP_CLIENT_METADATA_PATH}`, ...buildClientMetadata(baseUrl) },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );

  return withCors(response);
}

export function OPTIONS() {
  return corsPreflightResponse();
}
