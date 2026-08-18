import "server-only";

import { getBaseUrl, getMcpResourceUrl } from "@/lib/oauth/config";
import { withCors } from "@/lib/oauth/cors";
import { verifyAccessToken, type TokenRecord } from "@/lib/oauth/store";

/** The raw token is carried through so it can populate the SDK's AuthInfo. */
export type McpAuthContext = TokenRecord & { token: string };

type AuthResult =
  | { ok: true; context: McpAuthContext }
  | { ok: false; response: Response };

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const [scheme, ...rest] = header.trim().split(/\s+/);

  if (scheme.toLowerCase() !== "bearer" || rest.length === 0) {
    return null;
  }

  return rest.join(" ").trim() || null;
}

/**
 * RFC 9728 challenge. The resource_metadata pointer is how a client that has
 * never seen this server discovers where to authorize, so it must be present
 * on every 401 the MCP endpoint returns.
 */
function challengeResponse(
  request: Request,
  status: number,
  error: string,
  description: string,
) {
  const resourceMetadataUrl = `${getBaseUrl(
    request,
  )}/.well-known/oauth-protected-resource`;

  const challenge = [
    `Bearer resource_metadata="${resourceMetadataUrl}"`,
    `error="${error}"`,
    `error_description="${description}"`,
  ].join(", ");

  return withCors(
    new Response(
      JSON.stringify({ error, error_description: description }),
      {
        status,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": challenge,
        },
      },
    ),
  );
}

export async function authenticateMcpRequest(
  request: Request,
): Promise<AuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: false,
      response: challengeResponse(
        request,
        401,
        "invalid_request",
        "Authorization header with a Bearer access token is required.",
      ),
    };
  }

  const context = await verifyAccessToken(token);

  if (!context) {
    return {
      ok: false,
      response: challengeResponse(
        request,
        401,
        "invalid_token",
        "The access token is invalid or has expired.",
      ),
    };
  }

  // RFC 8707 audience binding: a token minted for a different resource must not
  // be replayable here, even though this server is currently its own issuer.
  if (context.resource && context.resource !== getMcpResourceUrl(request)) {
    return {
      ok: false,
      response: challengeResponse(
        request,
        403,
        "invalid_token",
        "The access token was not issued for this resource.",
      ),
    };
  }

  return { ok: true, context: { ...context, token } };
}
