import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";
import { deleteRegisteredClient } from "@/lib/oauth/clients";

export const runtime = "nodejs";

/** Deletes the registration and every token it holds. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ clientId: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { clientId } = await context.params;

  try {
    const { revokedTokens } = await deleteRegisteredClient(clientId);
    return NextResponse.json({ ok: true, revokedTokens });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to delete that client.", 400);
  }
}
