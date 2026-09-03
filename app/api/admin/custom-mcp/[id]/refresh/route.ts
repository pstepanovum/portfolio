import { NextResponse, type NextRequest } from "next/server";
import { refreshCustomMcpServer } from "@/lib/connections/custom-mcp";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Re-discovers the remote's tools; a failure is recorded on the server row. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const server = await refreshCustomMcpServer(id);

  return server ? NextResponse.json({ server }) : jsonError("Server not found.", 404);
}
