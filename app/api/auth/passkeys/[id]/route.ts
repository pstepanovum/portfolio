import { NextResponse, type NextRequest } from "next/server";
import { PasskeyNotFoundError, removePasskey } from "@/lib/auth/passkeys";
import { secondFactorError, verifyFreshSecondFactor, type SecondFactorProof } from "@/lib/auth/step-up";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** Removes a passkey. Needs a fresh second factor, and never removes the last one left. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session?.mfaSatisfied) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as SecondFactorProof | null;

  try {
    await verifyFreshSecondFactor(request, session.uid, body);
    await removePasskey(session.uid, id);
  } catch (error) {
    if (error instanceof PasskeyNotFoundError) return jsonError(error.message, 404);
    return secondFactorError(error);
  }

  return NextResponse.json({ success: true });
}
