import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildFinanceMcpServer } from "@/lib/mcp/finance-server";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";
import { authenticateMcpRequest } from "@/lib/oauth/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Streamable HTTP MCP endpoint for linked bank accounts.
 *
 * Its own OAuth resource, so a token issued for the portfolio or apps server
 * is rejected here and a token issued here reaches nothing else. Stateless for
 * the same reason as the other two: Cloud Run gives no instance affinity.
 */
async function handle(request: Request) {
  const auth = await authenticateMcpRequest(request, "finance");

  if (!auth.ok) {
    return auth.response;
  }

  const { token, clientId, scopes, resource } = auth.context;
  const server = buildFinanceMcpServer(scopes, clientId);
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
    console.error("Finance MCP request failed", error);

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
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
