import { NextResponse, type NextRequest } from "next/server";
import { createRegistrationOptions } from "@/lib/auth/passkeys";
import {
  getRelyingParty,
  newChallengeBinding,
  secondFactorError,
  setChallengeCookie,
  verifyFreshSecondFactor,
  type SecondFactorProof,
} from "@/lib/auth/step-up";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/**
 * Begins adding a passkey. Needs an enrolled, satisfied second factor and a
 * fresh proof in this request (a passkey assertion or a current code), for
 * the same reason as authenticator enrollment: a hijacked session must not be
 * able to add a key of its own. The registration challenge it returns is
 * bound to this session and expires in five minutes.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session?.mfaSatisfied) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as SecondFactorProof | null;

  try {
    await verifyFreshSecondFactor(request, session.uid, body);
  } catch (error) {
    return secondFactorError(error);
  }

  const { nonce, binding } = newChallengeBinding(request);

  try {
    const options = await createRegistrationOptions(session.uid, session.email ?? "admin", getRelyingParty(request), binding);
    const response = NextResponse.json({ options });
    setChallengeCookie(response, nonce);
    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to start passkey registration.", 400);
  }
}
