import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getMcpResourceUrl, parseScopeString } from "@/lib/oauth/config";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";
import { readOAuthFormBody } from "@/lib/oauth/request";
import {
  consumeAuthorizationCode,
  consumeRefreshToken,
  getOAuthClient,
  issueTokenSet,
  type IssuedTokenSet,
} from "@/lib/oauth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function oauthError(error: string, description: string, status = 400) {
  return withCors(
    NextResponse.json(
      { error, error_description: description },
      { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
    ),
  );
}

function tokenResponse(tokens: IssuedTokenSet) {
  return withCors(
    NextResponse.json(
      {
        access_token: tokens.accessToken,
        token_type: "Bearer",
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
        scope: tokens.scopes.join(" "),
      },
      { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
    ),
  );
}

function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/** PKCE S256 only: base64url(sha256(verifier)) must equal the stored challenge. */
function verifyPkce(codeVerifier: string, codeChallenge: string) {
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  const derived = createHash("sha256").update(codeVerifier).digest("base64url");

  return constantTimeEquals(derived, codeChallenge);
}

export async function POST(request: Request) {
  const body = await readOAuthFormBody(request);
  const grantType = body.get("grant_type");
  const clientId = body.get("client_id") || "";

  if (!clientId) {
    return oauthError("invalid_client", "client_id is required.", 401);
  }

  const client = await getOAuthClient(clientId);

  if (!client) {
    return oauthError("invalid_client", "Unknown client_id.", 401);
  }

  if (grantType === "authorization_code") {
    const code = body.get("code") || "";
    const codeVerifier = body.get("code_verifier") || "";
    const redirectUri = body.get("redirect_uri") || "";

    if (!code || !codeVerifier || !redirectUri) {
      return oauthError(
        "invalid_request",
        "code, code_verifier, and redirect_uri are required.",
      );
    }

    const record = await consumeAuthorizationCode(code);

    if (!record) {
      return oauthError(
        "invalid_grant",
        "The authorization code is invalid, expired, or already used.",
      );
    }

    if (record.clientId !== clientId) {
      return oauthError(
        "invalid_grant",
        "The authorization code was issued to a different client.",
      );
    }

    if (record.redirectUri !== redirectUri) {
      return oauthError("invalid_grant", "redirect_uri does not match.");
    }

    if (!verifyPkce(codeVerifier, record.codeChallenge)) {
      return oauthError("invalid_grant", "PKCE verification failed.");
    }

    const requestedResource = body.get("resource");

    if (
      requestedResource &&
      record.resource &&
      requestedResource !== record.resource
    ) {
      return oauthError(
        "invalid_target",
        "resource does not match the authorization request.",
      );
    }

    const tokens = await issueTokenSet({
      clientId,
      scopes: record.scopes,
      resource: record.resource || getMcpResourceUrl(request),
    });

    return tokenResponse(tokens);
  }

  if (grantType === "refresh_token") {
    const refreshToken = body.get("refresh_token") || "";

    if (!refreshToken) {
      return oauthError("invalid_request", "refresh_token is required.");
    }

    const record = await consumeRefreshToken(refreshToken);

    if (!record) {
      return oauthError(
        "invalid_grant",
        "The refresh token is invalid or expired.",
      );
    }

    if (record.clientId !== clientId) {
      return oauthError(
        "invalid_grant",
        "The refresh token was issued to a different client.",
      );
    }

    // A refresh may narrow scope but never widen it.
    const requestedScopes = parseScopeString(body.get("scope"));
    const widened = requestedScopes.filter(
      (scope) => !record.scopes.includes(scope),
    );

    if (widened.length > 0) {
      return oauthError(
        "invalid_scope",
        "Refresh cannot request scopes beyond the original grant.",
      );
    }

    const tokens = await issueTokenSet({
      clientId,
      scopes: requestedScopes.length > 0 ? requestedScopes : record.scopes,
      resource: record.resource,
      grantId: record.grantId,
    });

    return tokenResponse(tokens);
  }

  return oauthError(
    "unsupported_grant_type",
    "Supported grant types are authorization_code and refresh_token.",
  );
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
