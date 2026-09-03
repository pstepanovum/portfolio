import "server-only";

import { siteConfig } from "@/lib/seo";

export const OAUTH_SCOPE_READ = "portfolio:read";
export const OAUTH_SCOPE_WRITE = "portfolio:write";
export const GMAIL_SCOPE_READ = "gmail:read";
export const GMAIL_SCOPE_WRITE = "gmail:write";
export const GOOGLE_SCOPE_READ = "google:read";
export const GOOGLE_SCOPE_WRITE = "google:write";
export const MCP_SCOPE_TOOLS = "mcp:tools";

export type McpResourceKey = "portfolio" | "admin";

export type McpResource = {
  key: McpResourceKey;
  path: string;
  name: string;
  scopes: string[];
  defaultScopes: string[];
  documentationPath: string;
};

/**
 * One authorization server, several protected resources.
 *
 * Each MCP endpoint is its own RFC 9728 resource with its own scope set, and
 * tokens are audience-bound to exactly one of them. That is what keeps a
 * portfolio-only connection from ever reaching a mailbox, and lets each server
 * appear in a client as a separate connector with its own consent.
 */
export const MCP_RESOURCES: Record<McpResourceKey, McpResource> = {
  portfolio: {
    key: "portfolio",
    path: "/api/mcp",
    name: "Pavel Stepanov Portfolio MCP",
    scopes: [OAUTH_SCOPE_READ, OAUTH_SCOPE_WRITE],
    defaultScopes: [OAUTH_SCOPE_READ],
    documentationPath: "/dashboard/settings",
  },
  admin: {
    key: "admin",
    path: "/api/mcp/admin",
    name: "Pavel Stepanov Admin MCP",
    scopes: [GMAIL_SCOPE_READ, GMAIL_SCOPE_WRITE, GOOGLE_SCOPE_READ, GOOGLE_SCOPE_WRITE, MCP_SCOPE_TOOLS],
    defaultScopes: [GMAIL_SCOPE_READ],
    documentationPath: "/dashboard/connections",
  },
};

/** Union across resources, for authorization-server metadata. */
export const SUPPORTED_SCOPES: string[] = Array.from(
  new Set(Object.values(MCP_RESOURCES).flatMap((resource) => resource.scopes)),
);

/** Kept for callers that only ever meant the portfolio server. */
export const MCP_ENDPOINT_PATH = MCP_RESOURCES.portfolio.path;
export const AUTHORIZATION_PAGE_PATH = "/oauth/authorize";

export const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LOCAL_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i;

/**
 * Resolves the canonical origin for issuer, endpoint, and audience values.
 *
 * Deliberately does not trust the Host header in production: a spoofed host
 * would otherwise let an attacker mint metadata pointing at their own server.
 * Set OAUTH_ISSUER to override (preview deployments, custom domains).
 */
type HeaderSource = { headers: Pick<Headers, "get"> };

export function getBaseUrl(request: HeaderSource) {
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

export function getMcpResourceUrl(
  request: HeaderSource,
  key: McpResourceKey = "portfolio",
) {
  return `${getBaseUrl(request)}${MCP_RESOURCES[key].path}`;
}

/**
 * RFC 9728 metadata location for a resource. The portfolio server keeps the
 * root document so already-connected clients keep working; every other
 * resource uses the path-suffixed form.
 */
export function getResourceMetadataUrl(
  request: HeaderSource,
  key: McpResourceKey = "portfolio",
) {
  const base = `${getBaseUrl(request)}/.well-known/oauth-protected-resource`;

  return key === "portfolio" ? base : `${base}${MCP_RESOURCES[key].path}`;
}

/** Maps a request path (or discovery suffix) back to the resource it names. */
export function findResourceByPath(path: string | null | undefined) {
  const normalized = `/${(path ?? "").replace(/^\/+/, "").replace(/\/+$/, "")}`;

  return (
    Object.values(MCP_RESOURCES).find((resource) => resource.path === normalized) ??
    null
  );
}

/**
 * Maps an RFC 8707 `resource` parameter to a known resource. Only the canonical
 * origin is accepted, so a URL on another host can never be bound into a token.
 */
export function findResourceByUrl(
  request: HeaderSource,
  resourceUrl: string | null | undefined,
) {
  if (!resourceUrl) {
    return null;
  }

  const base = getBaseUrl(request);

  return (
    Object.values(MCP_RESOURCES).find(
      (resource) => `${base}${resource.path}` === resourceUrl.replace(/\/+$/, ""),
    ) ?? null
  );
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

/** Requested scopes narrowed to what the named resource actually grants. */
export function normalizeScopes(
  raw: string | null | undefined,
  key: McpResourceKey = "portfolio",
) {
  const resource = MCP_RESOURCES[key];
  const requested = parseScopeString(raw);

  if (requested.length === 0) {
    return [...resource.defaultScopes];
  }

  const granted = requested.filter((scope) => resource.scopes.includes(scope));

  return granted.length > 0 ? granted : [...resource.defaultScopes];
}

export function hasScope(scopes: string[], scope: string) {
  return scopes.includes(scope);
}

export function hasWriteScope(scopes: string[]) {
  return hasScope(scopes, OAUTH_SCOPE_WRITE);
}

/** True for any `<area>:write` scope, used to raise the consent-screen warning. */
export function grantsWriteAccess(scopes: string[]) {
  return scopes.some((scope) => scope.endsWith(":write"));
}
