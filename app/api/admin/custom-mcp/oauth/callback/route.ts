import { NextResponse, type NextRequest } from "next/server";
import { completeOAuth } from "@/lib/connections/custom-mcp";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { getBaseUrl } from "@/lib/oauth/config";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Where a remote MCP server's authorization server sends the admin back. The
 * admin session is required so a captured callback link cannot bind a remote
 * to this dashboard, and the state must match a pending server record.
 */
export async function GET(request: NextRequest) {
  const base = getBaseUrl(request);
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return NextResponse.redirect(new URL("/login?next=%2Fdashboard%2Fconnections", base), { status: 303 });
  }

  const query = request.nextUrl.searchParams;
  const state = query.get("state") ?? "";
  const code = query.get("code");
  const remoteError = query.get("error");

  const back = (path: string, params: Record<string, string>) => {
    const url = new URL(path, base);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return NextResponse.redirect(url, { status: 303 });
  };

  if (remoteError) {
    return back("/dashboard/connections", {
      error: `The remote server returned "${remoteError}"${query.get("error_description") ? `: ${query.get("error_description")}` : "."}`,
    });
  }

  if (!code || !state) {
    return back("/dashboard/connections", { error: "The remote server did not return an authorization code." });
  }

  try {
    const server = await completeOAuth(state, code);

    return back(`/dashboard/connections/custom/${server.id}`, {
      [server.status === "active" ? "connected" : "error"]:
        server.status === "active" ? server.name : server.lastError ?? "Tool discovery failed.",
    });
  } catch (error) {
    return back("/dashboard/connections", {
      error: error instanceof Error ? error.message : "Unable to complete the authorization.",
    });
  }
}
