import { NextResponse } from "next/server";
import {
  SUPPORTED_SCOPES,
  getBaseUrl,
  getMcpResourceUrl,
} from "@/lib/oauth/config";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 9728 Protected Resource Metadata. Reached via the /.well-known rewrite. */
export async function GET(request: Request) {
  return withCors(
    NextResponse.json({
      resource: getMcpResourceUrl(request),
      authorization_servers: [getBaseUrl(request)],
      scopes_supported: SUPPORTED_SCOPES,
      bearer_methods_supported: ["header"],
      resource_name: "Pavel Stepanov Portfolio MCP",
      resource_documentation: `${getBaseUrl(request)}/dashboard/settings`,
    }),
  );
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
