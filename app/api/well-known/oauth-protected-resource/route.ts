import { NextResponse } from "next/server";
import {
  MCP_RESOURCES,
  findResourceByPath,
  getBaseUrl,
} from "@/lib/oauth/config";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 9728 Protected Resource Metadata.
 *
 * Reached via the /.well-known rewrite, which forwards any path suffix as the
 * `resource` query parameter. No suffix means the root document, which stays
 * the portfolio server so existing connectors keep working.
 */
const WELL_KNOWN_PREFIX = "/.well-known/oauth-protected-resource";

/**
 * Route handlers see the original, pre-rewrite URL, so the suffix is read
 * from the pathname first; the rewrite's ?resource= is kept as a fallback for
 * any runtime that exposes the rewritten URL instead.
 */
function getRequestedSuffix(request: Request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith(`${WELL_KNOWN_PREFIX}/`)) {
    return url.pathname.slice(WELL_KNOWN_PREFIX.length);
  }

  return url.searchParams.get("resource");
}

export async function GET(request: Request) {
  const suffix = getRequestedSuffix(request);
  const resource = suffix
    ? findResourceByPath(suffix)
    : MCP_RESOURCES.portfolio;

  if (!resource) {
    return withCors(
      NextResponse.json(
        { error: "not_found", error_description: "Unknown resource." },
        { status: 404 },
      ),
    );
  }

  const baseUrl = getBaseUrl(request);

  return withCors(
    NextResponse.json({
      resource: `${baseUrl}${resource.path}`,
      authorization_servers: [baseUrl],
      scopes_supported: resource.scopes,
      bearer_methods_supported: ["header"],
      resource_name: resource.name,
      resource_documentation: `${baseUrl}${resource.documentationPath}`,
    }),
  );
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
