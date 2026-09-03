import { NextResponse, type NextRequest } from "next/server";
import { deleteCustomMcpServer, getCustomMcpServer } from "@/lib/connections/custom-mcp";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const server = await getCustomMcpServer(id);

  return server ? NextResponse.json({ server }) : jsonError("Server not found.", 404);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  await deleteCustomMcpServer(id);

  return NextResponse.json({ success: true });
}
