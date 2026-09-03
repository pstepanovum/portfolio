import { NextResponse, type NextRequest } from "next/server";
import { requireAdminRequest } from "@/lib/firebase/http";
import { revokeGrant } from "@/lib/oauth/clients";

export const runtime = "nodejs";

/** Disconnect a client: its access and refresh tokens are deleted immediately. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ grantId: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { grantId } = await context.params;
  const removed = await revokeGrant(grantId);

  return NextResponse.json({ success: true, removed });
}
