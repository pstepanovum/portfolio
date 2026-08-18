import { NextResponse } from "next/server";
import {
  AUTHORIZATION_PAGE_PATH,
  SUPPORTED_SCOPES,
  getBaseUrl,
} from "@/lib/oauth/config";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 8414 Authorization Server Metadata. */
export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);

  return withCors(
    NextResponse.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}${AUTHORIZATION_PAGE_PATH}`,
      token_endpoint: `${baseUrl}/api/oauth/token`,
      registration_endpoint: `${baseUrl}/api/oauth/register`,
      revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
      scopes_supported: SUPPORTED_SCOPES,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
    }),
  );
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
