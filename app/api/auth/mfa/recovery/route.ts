import { NextResponse, type NextRequest } from "next/server";
import { MfaError, regenerateRecoveryCodes, verifySecondFactor } from "@/lib/auth/mfa";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** New recovery codes; the old set is invalidated. Requires a current code. */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) return jsonError("Enter a current code to regenerate recovery codes.", 400);

  try {
    await verifySecondFactor(session.uid, body.code);
  } catch (error) {
    return jsonError(error instanceof MfaError ? error.message : "Unable to verify the code.", 401);
  }

  return NextResponse.json({ recoveryCodes: await regenerateRecoveryCodes(session.uid) });
}
