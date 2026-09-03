import "server-only";

import {
  AUTHORIZATION_PAGE_PATH,
  MCP_RESOURCES,
  findResourceByUrl,
  normalizeScopes,
  type McpResourceKey,
} from "@/lib/oauth/config";
import { getOAuthClient, type OAuthClient } from "@/lib/oauth/store";

export type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
  codeChallenge: string;
  resource?: string;
  resourceKey: McpResourceKey;
};

export type AuthorizeValidation =
  | { ok: true; client: OAuthClient; params: AuthorizeParams }
  | { ok: false; error: string; description: string; redirectable: boolean };

type RawParams = Record<string, string | undefined>;

/**
 * Validates an authorization request.
 *
 * `redirectable` marks errors that RFC 6749 says to report back to the client
 * via redirect_uri. Anything wrong with client_id or redirect_uri itself is not
 * redirectable and must be shown on our own page instead, or an attacker could
 * use this endpoint as an open redirect.
 */
export async function validateAuthorizeParams(
  raw: RawParams,
  request?: { headers: Pick<Headers, "get"> },
): Promise<AuthorizeValidation> {
  const clientId = raw.client_id?.trim() || "";
  const redirectUri = raw.redirect_uri?.trim() || "";

  if (!clientId) {
    return {
      ok: false,
      error: "invalid_request",
      description: "client_id is required.",
      redirectable: false,
    };
  }

  const client = await getOAuthClient(clientId);

  if (!client) {
    return {
      ok: false,
      error: "invalid_client",
      description: "This client is not registered with the portfolio.",
      redirectable: false,
    };
  }

  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return {
      ok: false,
      error: "invalid_request",
      description: "redirect_uri does not match a registered redirect URI.",
      redirectable: false,
    };
  }

  if ((raw.response_type?.trim() || "") !== "code") {
    return {
      ok: false,
      error: "unsupported_response_type",
      description: "Only the authorization code response type is supported.",
      redirectable: true,
    };
  }

  const codeChallenge = raw.code_challenge?.trim() || "";
  const codeChallengeMethod = raw.code_challenge_method?.trim() || "";

  if (!codeChallenge) {
    return {
      ok: false,
      error: "invalid_request",
      description: "code_challenge is required (PKCE).",
      redirectable: true,
    };
  }

  if (codeChallengeMethod !== "S256") {
    return {
      ok: false,
      error: "invalid_request",
      description: "code_challenge_method must be S256.",
      redirectable: true,
    };
  }

  // RFC 8707: the resource decides which scope set applies. A resource we do
  // not serve is refused outright rather than silently mapped to the default.
  const requestedResource = raw.resource?.trim() || undefined;
  let resourceKey: McpResourceKey = "portfolio";

  if (requestedResource) {
    const matched = request ? findResourceByUrl(request, requestedResource) : null;

    if (!matched) {
      return {
        ok: false,
        error: "invalid_target",
        description: "The requested resource is not served by this authorization server.",
        redirectable: true,
      };
    }

    resourceKey = matched.key;
  }

  return {
    ok: true,
    client,
    params: {
      clientId,
      redirectUri,
      scopes: normalizeScopes(raw.scope, resourceKey),
      state: raw.state?.trim() || undefined,
      codeChallenge,
      resource: requestedResource,
      resourceKey,
    },
  };
}

export function getResourceName(key: McpResourceKey) {
  return MCP_RESOURCES[key].name;
}

export function buildAuthorizeUrl(raw: RawParams) {
  const search = new URLSearchParams();

  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0) {
      search.set(key, value);
    }
  });

  const query = search.toString();

  return query ? `${AUTHORIZATION_PAGE_PATH}?${query}` : AUTHORIZATION_PAGE_PATH;
}

export function buildRedirectWithError(
  redirectUri: string,
  error: string,
  description: string,
  state?: string,
) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);

  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
}

export function buildRedirectWithCode(
  redirectUri: string,
  code: string,
  state?: string,
) {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);

  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
}

/** Flattens Next.js searchParams, taking the first value of repeated keys. */
export function flattenSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): RawParams {
  const flattened: RawParams = {};

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      flattened[key] = value;
    } else if (Array.isArray(value) && typeof value[0] === "string") {
      flattened[key] = value[0];
    }
  });

  return flattened;
}
