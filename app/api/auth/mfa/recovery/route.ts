import { NextResponse, type NextRequest } from "next/server";
import { regenerateRecoveryCodes } from "@/lib/auth/mfa";
import { secondFactorError, verifyFreshSecondFactor, type SecondFactorProof } from "@/lib/auth/step-up";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** New recovery codes; the old set is invalidated. Requires a current code or passkey. */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as SecondFactorProof | null;

  try {
    await verifyFreshSecondFactor(request, session.uid, body);
  } catch (error) {
    return secondFactorError(error);
  }

  return NextResponse.json({ recoveryCodes: await regenerateRecoveryCodes(session.uid) });
}
