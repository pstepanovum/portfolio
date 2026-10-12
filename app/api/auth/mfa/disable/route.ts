import { NextResponse, type NextRequest } from "next/server";
import { disableTotp } from "@/lib/auth/mfa";
import { secondFactorError, verifyFreshSecondFactor, type SecondFactorProof } from "@/lib/auth/step-up";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/**
 * Turns off the authenticator app. Requires a current code or passkey, so a
 * hijacked session cannot do it silently, and is refused while the app is the
 * only second factor left.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as SecondFactorProof | null;

  try {
    await verifyFreshSecondFactor(request, session.uid, body);
    await disableTotp(session.uid);
  } catch (error) {
    return secondFactorError(error);
  }

  return NextResponse.json({ success: true });
}
