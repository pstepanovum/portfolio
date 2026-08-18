import { NextResponse } from "next/server";
import { SUPPORTED_SCOPES } from "@/lib/oauth/config";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";
import { registerOAuthClient } from "@/lib/oauth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REDIRECT_URIS = 10;

function oauthError(error: string, description: string, status = 400) {
  return withCors(
    NextResponse.json({ error, error_description: description }, { status }),
  );
}

/**
 * Loopback HTTP is allowed for native clients (RFC 8252), plain HTTP on a
 * public host is not. Non-HTTP schemes are private-use redirects such as
 * `cursor://` or `vscode://`.
 */
function isAllowedRedirectUri(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.hash) {
    return false;
  }

  if (parsed.protocol === "https:") {
    return true;
  }

  if (parsed.protocol === "http:") {
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    );
  }

  return parsed.protocol.endsWith(":") && parsed.protocol !== "javascript:";
}

/**
 * RFC 7591 Dynamic Client Registration.
 *
 * Registration is deliberately open: it hands out only a public client id, and
 * no token can be minted without an admin sign-in at the consent screen.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body) {
    return oauthError(
      "invalid_client_metadata",
      "Request body must be a JSON object.",
    );
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter(
        (uri): uri is string => typeof uri === "string" && uri.trim().length > 0,
      )
    : [];

  if (redirectUris.length === 0) {
    return oauthError(
      "invalid_redirect_uri",
      "At least one redirect_uris entry is required.",
    );
  }

  if (redirectUris.length > MAX_REDIRECT_URIS) {
    return oauthError(
      "invalid_redirect_uri",
      `A client may register at most ${MAX_REDIRECT_URIS} redirect URIs.`,
    );
  }

  const invalidUri = redirectUris.find((uri) => !isAllowedRedirectUri(uri));

  if (invalidUri) {
    return oauthError(
      "invalid_redirect_uri",
      `Redirect URI is not allowed: ${invalidUri}`,
    );
  }

  const requestedAuthMethod =
    typeof body.token_endpoint_auth_method === "string"
      ? body.token_endpoint_auth_method
      : "none";

  if (requestedAuthMethod !== "none") {
    return oauthError(
      "invalid_client_metadata",
      "This server issues public clients only; use token_endpoint_auth_method 'none' with PKCE.",
    );
  }

  const clientName =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, 120)
      : "MCP Client";

  const client = await registerOAuthClient({ clientName, redirectUris });

  return withCors(
    NextResponse.json(
      {
        client_id: client.clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: SUPPORTED_SCOPES.join(" "),
      },
      { status: 201 },
    ),
  );
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
