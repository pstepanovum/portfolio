import "server-only";

import { siteConfig } from "@/lib/seo";

export const OAUTH_SCOPE_READ = "portfolio:read";
export const OAUTH_SCOPE_WRITE = "portfolio:write";

export const SUPPORTED_SCOPES: string[] = [OAUTH_SCOPE_READ, OAUTH_SCOPE_WRITE];
export const DEFAULT_SCOPES: string[] = [OAUTH_SCOPE_READ];

export const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const MCP_ENDPOINT_PATH = "/api/mcp";
export const AUTHORIZATION_PAGE_PATH = "/oauth/authorize";

const LOCAL_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i;

/**
 * Resolves the canonical origin for issuer, endpoint, and audience values.
 *
 * Deliberately does not trust the Host header in production: a spoofed host
 * would otherwise let an attacker mint metadata pointing at their own server.
 * Set OAUTH_ISSUER to override (preview deployments, custom domains).
 */
export function getBaseUrl(request: Request) {
  const configuredIssuer = process.env.OAUTH_ISSUER?.trim();

  if (configuredIssuer) {
    return configuredIssuer.replace(/\/+$/, "");
  }

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!host) {
    return siteConfig.url;
  }

  const isLocalHost = LOCAL_HOST_PATTERN.test(host);

  if (process.env.NODE_ENV === "production" && !isLocalHost) {
    return siteConfig.url;
  }

  const protocol =
    request.headers.get("x-forwarded-proto") || (isLocalHost ? "http" : "https");

  return `${protocol}://${host}`;
}

export function getMcpResourceUrl(request: Request) {
  return `${getBaseUrl(request)}${MCP_ENDPOINT_PATH}`;
}

export function parseScopeString(raw?: string | null) {
  if (!raw) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      raw
        .split(/\s+/)
        .map((scope) => scope.trim())
        .filter(Boolean),
    ),
  );
}

/** Requested scopes narrowed to what this server actually grants. */
export function normalizeScopes(raw?: string | null) {
  const requested = parseScopeString(raw);

  if (requested.length === 0) {
    return [...DEFAULT_SCOPES];
  }

  const granted = requested.filter((scope) => SUPPORTED_SCOPES.includes(scope));

  return granted.length > 0 ? granted : [...DEFAULT_SCOPES];
}

export function hasWriteScope(scopes: string[]) {
  return scopes.includes(OAUTH_SCOPE_WRITE);
}
