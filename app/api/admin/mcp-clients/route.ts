import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";
import { listConnectedClients } from "@/lib/oauth/clients";
import { MCP_RESOURCES, type McpResourceKey } from "@/lib/oauth/config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const key = request.nextUrl.searchParams.get("server") ?? "";

  if (!(key in MCP_RESOURCES)) {
    return jsonError("Unknown server.", 400);
  }

  return NextResponse.json({ clients: await listConnectedClients(request, key as McpResourceKey) });
}
