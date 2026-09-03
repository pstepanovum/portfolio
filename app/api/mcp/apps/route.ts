import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildAdminMcpServer } from "@/lib/mcp/admin-server";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";
import { authenticateMcpRequest } from "@/lib/oauth/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Streamable HTTP MCP endpoint for the private apps server.
 *
 * Runs stateless: a fresh server and transport are built per request and JSON
 * responses are returned instead of SSE streams. Firebase App Hosting serves
 * this from Cloud Run, where consecutive requests can land on different
 * instances, so no session state may live in process memory.
 */
async function handle(request: Request) {
  const auth = await authenticateMcpRequest(request, "apps");

  if (!auth.ok) {
    return auth.response;
  }

  const { token, clientId, scopes, resource } = auth.context;
  const server = await buildAdminMcpServer(scopes, clientId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);

    const response = await transport.handleRequest(request, {
      authInfo: {
        token,
        clientId,
        scopes,
        resource: resource ? new URL(resource) : undefined,
      },
    });

    return withCors(response);
  } catch (error) {
    console.error("MCP request failed", error);

    return withCors(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );
  } finally {
    // Safe to tear down here: enableJsonResponse means handleRequest resolves
    // with a fully materialised body rather than an open stream.
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function POST(request: Request) {
  return handle(request);
}

/**
 * Stateless mode has no SSE stream to attach to and no session to delete, but
 * both verbs must still answer past auth so clients get a protocol-level
 * response instead of a Next.js 405 page.
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
