const ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "Mcp-Session-Id",
  "MCP-Protocol-Version",
  "Last-Event-ID",
].join(", ");

const EXPOSED_HEADERS = ["WWW-Authenticate", "Mcp-Session-Id"].join(", ");

/**
 * Browser-based MCP clients call these endpoints cross-origin. Wildcard origin
 * is safe here because every protected route authenticates with an explicit
 * Authorization header rather than cookies.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  "Access-Control-Expose-Headers": EXPOSED_HEADERS,
  "Access-Control-Max-Age": "86400",
};

export function withCors<T extends Response>(response: T) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function corsPreflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
